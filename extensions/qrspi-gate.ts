/**
 * QRSPI gate
 *
 * Enforces the rules a prompt alone will not hold (see the qrspi skill), and
 * only where they are worth the ceremony: an effort marked critical.
 *
 * 1. Code writes. While a CRITICAL effort's state.md names an alignment stage
 *    (Questions..Plan), writes into the repo are blocked, except under
 *    .scratch/ where the artifacts live. A non-critical effort runs the same
 *    eight stages: writes go through, and the gate warns once per stage.
 * 2. Sensitive paths. Auth, migrations, CI, infra, payments and secrets make a
 *    change critical whatever state.md claims, so `Critical: no` cannot
 *    downgrade it. Paths come from the built-in list plus an optional
 *    <repo>/.qrspi-sensitive-paths.
 * 3. Release. A critical effort leaves alignment only when the human answers a
 *    questionnaire whose id is `qrspi_release`, so the agent cannot release
 *    itself. The answer is read from the tool result, not from the agent.
 * 4. Asking. During stage Research the gate warns: research asks the code, not
 *    the human.
 * 5. Context. Warn once per session past 60% usage.
 *
 * .scratch/ACTIVE names the live effort, a one-line slug. No ACTIVE file means
 * no gate, so unrelated repos and trivial work are untouched. The human
 * releases a critical effort by setting state.md to Implement.
 *
 * Toggle: /qrspi on | off | status   (default ON)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

const ALIGNMENT = ["Questions", "Research", "Design", "Structure", "Plan"];
const ALL_STAGES = [...ALIGNMENT, "Work Tree", "Implement", "PR"];

/** Stage aliases, so a hand-written or legacy state.md still parses. */
const ALIASES: Record<string, string> = {
	q: "Questions",
	question: "Questions",
	questions: "Questions",
	r: "Research",
	research: "Research",
	d: "Design",
	design: "Design",
	s: "Structure",
	structure: "Structure",
	p: "Plan",
	plan: "Plan",
	w: "Work Tree",
	wt: "Work Tree",
	"work tree": "Work Tree",
	worktree: "Work Tree",
	i: "Implement",
	implement: "Implement",
	pr: "PR",
	review: "PR",
};

/**
 * Paths that make a change critical on their own, matched case-insensitively
 * against the repo-relative path. A repo can add to this list in
 * .qrspi-sensitive-paths (one glob-ish substring per line, # for comments).
 */
const DEFAULT_SENSITIVE = [
	"auth",
	"login",
	"session",
	"oauth",
	"permission",
	"rbac",
	"migration",
	"payment",
	"billing",
	"stripe",
	"invoice",
	"secrets",
	".env",
	"crypto",
	"terraform",
	"k8s",
	"helm",
	"docker-compose",
	"dockerfile",
	".github/workflows",
	"infra/",
];

const WRITE_TOOLS = new Set(["edit", "write"]);
const ASK_TOOLS = new Set(["question", "questionnaire"]);

const CONTEXT_WARN_PERCENT = 60;

function normalizeStage(raw: string): string | undefined {
	const key = raw
		.trim()
		.toLowerCase()
		.replace(/[^a-z ]/g, "")
		.replace(/\s+/g, " ");
	if (!key) return undefined;
	const direct = ALL_STAGES.find((s) => s.toLowerCase() === key);
	if (direct) return direct;
	return ALIASES[key];
}

/** Pull the stage out of a state.md body. First `Stage:` line wins. */
function parseStage(text: string): string | undefined {
	const m = /\bstage\b\**\s*:\s*([^\n(]+)/i.exec(text);
	if (!m) return undefined;
	return normalizeStage(m[1]);
}

/** Is this effort marked critical? Absent or unparseable means no. */
function parseCritical(text: string): boolean {
	const m = /\bcritical\b\**\s*:\s*([^\n(]+)/i.exec(text);
	if (!m) return false;
	return /^(yes|true|y|critical)\b/i.test(m[1].trim());
}

/** The stage the incoming write would set, or undefined when it does not say. */
function stageFromInput(input: any): string | undefined {
	if (typeof input?.content === "string") {
		const fromWrite = parseStage(input.content);
		if (fromWrite) return fromWrite;
	}
	if (Array.isArray(input?.edits)) {
		const joined = input.edits
			.map((e: any) => (typeof e?.newText === "string" ? e.newText : ""))
			.join("\n");
		const fromEdit = parseStage(joined);
		if (fromEdit) return fromEdit;
	}
	return undefined;
}

/** Did this tool result carry the human's release answer? */
function releaseAnswered(toolName: string, details: any): boolean {
	const answers = details?.answers;
	if (Array.isArray(answers)) {
		return answers.some(
			(a: any) => a?.id === "qrspi_release" && /^release/i.test(String(a?.value ?? "")),
		);
	}
	if (toolName !== "question") return false;
	const answer = String(details?.answer ?? "").trim();
	return /^release/i.test(answer) && /release/i.test(String(details?.question ?? ""));
}

/** Walk up from cwd looking for .scratch/ACTIVE. That file names the live effort. */
function findActiveEffort(cwd: string): { root: string; slug: string } | undefined {
	let dir = path.resolve(cwd);
	for (let hops = 0; hops < 24; hops++) {
		try {
			const raw = fs.readFileSync(path.join(dir, ".scratch", "ACTIVE"), "utf8");
			const slug = raw.trim().split(/\s+/)[0];
			if (slug) return { root: dir, slug };
		} catch {
			// no ACTIVE here; keep walking up
		}
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return undefined;
}

function stagePath(root: string, slug: string): string {
	return path.join(root, ".scratch", slug, "state.md");
}

function readStateFile(root: string, slug: string): string {
	try {
		return fs.readFileSync(stagePath(root, slug), "utf8");
	} catch {
		return "";
	}
}

function readStage(root: string, slug: string): string | undefined {
	return parseStage(readStateFile(root, slug));
}

function readCritical(root: string, slug: string): boolean {
	return parseCritical(readStateFile(root, slug));
}

/** Built-in list plus an optional per-repo .qrspi-sensitive-paths. */
function sensitivePatterns(root: string): string[] {
	const extra: string[] = [];
	try {
		for (const line of fs.readFileSync(path.join(root, ".qrspi-sensitive-paths"), "utf8").split("\n")) {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith("#")) extra.push(trimmed.toLowerCase());
		}
	} catch {
		// no repo list; defaults only
	}
	return [...DEFAULT_SENSITIVE, ...extra];
}

/** Does this repo-relative path make the change critical by itself? */
function isSensitivePath(rel: string, patterns: string[]): string | undefined {
	const lower = rel.toLowerCase();
	// Documentation is never the risk; skipping it kills the loudest false
	// positive (a doc named authorization.md must not gate the repo).
	if (lower.endsWith(".md") || lower.endsWith(".txt") || lower.startsWith("docs/")) return undefined;
	return patterns.find((p) => lower.includes(p)) ? lower : undefined;
}

export default function (pi: ExtensionAPI) {
	let enabled = true;
	let warnedAboutContext = false;
	/** Effort slug the human released to Implement this session. */
	let releasedSlug: string | undefined;
	/** Stages already warned about, for non-critical efforts. */
	const warnedStages = new Set<string>();
	let warnedResearchAsk = false;

	/** Warnings only where a human can see them. Child sessions run headless. */
	const say = (c: any, msg: string, level: "info" | "warning" = "info") => {
		if (c?.hasUI) c.ui.notify(msg, level);
	};

	// Fresh window, fresh budget: the whole point of the stage boundary.
	pi.on("session_start", async (_event, ctx) => {
		warnedAboutContext = false;
		releasedSlug = undefined;
		warnedStages.clear();
		warnedResearchAsk = false;

		// The release path needs a question tool. Say so once, and only to a human.
		const names = pi.getAllTools().map((t) => t.name);
		if (!names.includes("question") && !names.includes("questionnaire")) {
			say(
				ctx,
				`QRSPI: neither "question" nor "questionnaire" is installed, so a critical effort cannot be released. ` +
					`Install one, or close the effort before alignment would block.`,
				"warning",
			);
		}
	});

	// --- 3. The release is the human's answer, never the agent's claim ---------
	pi.on("tool_result", async (event, ctx) => {
		if (event.toolName !== "questionnaire" && event.toolName !== "question") return;
		if (!releaseAnswered(event.toolName, event.details)) return;
		releasedSlug = findActiveEffort(ctx.cwd)?.slug;
		say(ctx, `QRSPI: "${releasedSlug}" released to Implement by the human.`, "info");
	});

	pi.on("tool_call", async (event, ctx) => {
		if (!enabled) return;

		// --- 4. Research asks the codebase, not the human --------------------
		if (ASK_TOOLS.has(event.toolName)) {
			if (warnedResearchAsk) return;
			const effort = findActiveEffort(ctx.cwd);
			if (!effort) return;
			if (readStage(effort.root, effort.slug) !== "Research") return;
			warnedResearchAsk = true;
			say(ctx, 
				`QRSPI: "${effort.slug}" is at Research. Research asks the code, not the human. ` +
					`Send a subagent for anything evidence can settle.`,
				"warning",
			);
			return;
		}

		if (!WRITE_TOOLS.has(event.toolName)) return;

		const input = event.input as any;
		const target = typeof input?.path === "string" ? input.path : "";
		if (!target) return;

		const effort = findActiveEffort(ctx.cwd);
		if (!effort) return;

		const abs = path.resolve(ctx.cwd, target);
		const rel = path.relative(effort.root, abs);
		if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return; // outside the repo

		const inScratch = rel === ".scratch" || rel.startsWith(`.scratch${path.sep}`);
		const stage = readStage(effort.root, effort.slug);
		const aligning = !!stage && ALIGNMENT.includes(stage);
		const critical = readCritical(effort.root, effort.slug);

		// --- 2. Sensitive paths are critical whatever state.md says ----------
		if (!inScratch) {
			const hit = isSensitivePath(rel, sensitivePatterns(effort.root));
			if (hit && aligning) {
				return {
					block: true,
					reason:
						`Blocked: ${rel} is a sensitive path (${hit}). That makes this change critical on its own, ` +
					`and effort "${effort.slug}" is at ${stage}. Finish alignment first: ` +
					`set Stage: Implement only once the human answers the release question.`,
				};
			}
		}


		// --- 3. Leaving alignment needs the human's release --------------------
		const isStateMd =
			inScratch &&
			path.basename(abs) === "state.md" &&
			abs.split(path.sep).includes(effort.slug);
		if (isStateMd) {
			const next = stageFromInput(input);
			if (critical && next === "Implement" && releasedSlug !== effort.slug) {
				return {
					block: true,
					reason:
						`Blocked: "${effort.slug}" is not released, so alignment cannot end from here. ` +
						`Ask the human: questionnaire with question id qrspi_release and options ` +
						`"Release to Implement" / "Keep aligning", or a question whose answer starts with ` +
						`Release. Then write Stage: Implement.`,
				};
			}
			return; // the bookkeeping file is otherwise writable
		}

		if (inScratch) return; // the pipeline's artifacts are always writable
		if (!aligning) return;

		// --- 1. No code before the plan, for a critical effort ---------------
		if (critical) {
			return {
				block: true,
				reason:
					`Blocked: effort "${effort.slug}" is critical and at ${stage}. No code writes during alignment, ` +
				`only .scratch/ artifacts. To release it, ask the human the qrspi_release question; ` +
				`writing Implement yourself is blocked. If the change is trivial, ` +
				`close the effort and delete .scratch/ACTIVE.`,
			};
		}

		if (!warnedStages.has(stage)) {
			warnedStages.add(stage);
			say(ctx, 
				`QRSPI: "${effort.slug}" is at ${stage} and not critical, so this write is allowed. ` +
					`Keep the stage discipline anyway.`,
				"warning",
			);
		}
		return;
	});

	// --- 5. Context discipline ----------------------------------------------
	pi.on("turn_end", async (_event, ctx) => {
		if (!enabled || warnedAboutContext) return;
		if (!ctx.hasUI) return; // a child cannot act on a hand-off
		const usage = ctx.getContextUsage?.();
		const percent = usage?.percent;
		if (percent === null || percent === undefined) return;
		if (percent < CONTEXT_WARN_PERCENT) return;

		warnedAboutContext = true;
		const message =
			`QRSPI: context at ${Math.round(percent)}% (${usage?.tokens ?? "?"} / ${usage?.contextWindow ?? "?"} tokens). ` +
			`Hand off at 60%: write what this stage learned into its artifact, leave state.md on the same stage, ` +
			`finish the stage in a new session. Do not start another stage here.`;
		say(ctx, message, "warning");
		if (ctx.isIdle()) {
			pi.sendUserMessage(message);
		} else {
			pi.sendUserMessage(message, { deliverAs: "followUp" });
		}
	});

	// --- Runtime toggle ------------------------------------------------------
	pi.registerCommand("qrspi", {
		description: "Toggle the QRSPI gate (on | off | status)",
		handler: async (args, ctx) => {
			const arg = (args || "").trim().toLowerCase();
			const effort = findActiveEffort(ctx.cwd);
			const where = effort
				? `${effort.slug} at ${readStage(effort.root, effort.slug) ?? "unknown stage"}` +
					`, ${readCritical(effort.root, effort.slug) ? "critical" : "not critical"} (${effort.root})`
				: "no active effort (.scratch/ACTIVE not found)";

			if (arg === "on") {
				enabled = true;
				say(ctx, `QRSPI gate: ON. Active: ${where}`, "info");
			} else if (arg === "off") {
				enabled = false;
				say(ctx, "QRSPI gate: OFF. Writes are not gated until /qrspi on.", "warning");
			} else if (arg === "status") {
				say(ctx, `QRSPI gate: ${enabled ? "ON" : "OFF"}. Active: ${where}`, "info");
			} else {
				say(ctx, `Usage: /qrspi [on|off|status]. Active: ${where}`, "info");
			}
		},
	});
}
