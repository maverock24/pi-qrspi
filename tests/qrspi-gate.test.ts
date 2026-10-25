/**
 * Ad-hoc test for the QRSPI gate. Not part of the extension; run with:
 *   npm test
 * Drives the extension's own handlers with a fake pi, against a fake repo.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const mod: any = await import(new URL("../extensions/qrspi-gate.ts", import.meta.url).href);
const handlers: Record<string, Function[]> = {};
const commands: Record<string, any> = {};
const pi: any = {
	on: (evt: string, fn: Function) => (handlers[evt] ??= []).push(fn),
	registerCommand: (name: string, def: any) => (commands[name] = def),
	sendUserMessage: () => {},
};
mod.default(pi);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "qrspi-"));
const slug = "demo";
fs.mkdirSync(path.join(root, ".scratch", slug), { recursive: true });
const statePath = path.join(root, ".scratch", slug, "state.md");
const activePath = path.join(root, ".scratch", "ACTIVE");

const writeState = (stage: string, critical = "yes") =>
	fs.writeFileSync(
		statePath,
		`# Demo\n\n- **Slug**: ${slug}\n- **Stage**: ${stage} (next to run)\n- **Critical**: ${critical}\n- **Done**: none\n`,
	);
const setActive = (on: boolean) => (on ? fs.writeFileSync(activePath, slug + "\n") : fs.rmSync(activePath, { force: true }));
const freshSession = async () => {
	for (const h of handlers["session_start"] ?? []) await h({}, ctx);
};

const notices: string[] = [];
const ctx: any = {
	cwd: root,
	hasUI: true, // warnings only fire where a human can see them; children have no UI
	ui: { notify: (m: string) => notices.push(m) },
	isIdle: () => true,
	getContextUsage: () => undefined,
};
const call = async (toolName: string, input: any, c: any = ctx) => {
	let verdict: any;
	for (const h of handlers["tool_call"] ?? []) verdict = (await h({ toolName, input }, c)) ?? verdict;
	return verdict;
};
const advanceTo = (stage: string, critical = "yes") =>
	call("write", { path: `.scratch/${slug}/state.md`, content: `# x\n- **Stage**: ${stage} (next to run)\n- **Critical**: ${critical}\n` });

let failures = 0;
const check = (label: string, got: any, want: "block" | "allow") => {
	const isBlock = !!got?.block;
	const ok = want === "block" ? isBlock : !isBlock;
	if (!ok) failures++;
	console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (want ${want}, got ${isBlock ? "block" : "allow"})`);
};

console.log("--- critical effort: writes blocked ---");
setActive(true);
writeState("Design");
check("code edit at Design", await call("edit", { path: "src/app.ts", edits: [{ oldText: "a", newText: "b" }] }), "block");
check("new file at Design", await call("write", { path: "src/new.ts", content: "x" }), "block");
check("artifact write at Design", await call("write", { path: `.scratch/${slug}/research.md`, content: "f" }), "allow");
check("outside the repo", await call("write", { path: "/tmp/notes.md", content: "x" }), "allow");
check("bash (not a write tool)", await call("bash", { command: "echo x > src/app.ts" }), "allow");

console.log("--- state.md is an artifact: advances are never gated ---");
await freshSession();
writeState("Design");
check("advance Design -> Structure", await advanceTo("Structure"), "allow");
writeState("Structure");
check("second advance in one session", await advanceTo("Plan"), "allow");
check("revision in place", await advanceTo("Structure"), "allow");
writeState("Research");
check("jump Research -> Plan", await advanceTo("Plan"), "allow");
writeState("Implement"); // the fake repo never applies the allowed write
check("code edit at Implement", await call("edit", { path: "src/app.ts", edits: [{ oldText: "a", newText: "b" }] }), "allow");
writeState("PR");
check("code edit at PR", await call("edit", { path: "src/app.ts", edits: [{ oldText: "a", newText: "b" }] }), "allow");

console.log("--- release: the human's answer, not the agent's claim ---");
const answer = async (id: string, value: string) => {
	for (const h of handlers["tool_result"] ?? [])
		await h({ toolName: "questionnaire", details: { answers: [{ id, value, label: value }] } }, ctx);
};
setActive(true);
await freshSession();
notices.length = 0;
writeState("Plan", "yes");
check("self-release to Implement is blocked", await advanceTo("Implement"), "block");
await answer("qrspi_release", "keep-aligning");
check("a decline does not release", await advanceTo("Implement"), "block");
await answer("qrspi_release", "release");
check("the human's release answer opens it", await advanceTo("Implement"), "allow");
check("release was announced", notices.some((n) => n.includes("released")) ? {} : { block: true, reason: "no notice" }, "allow");
await freshSession();
writeState("Plan", "yes");
check("release does not survive a fresh session", await advanceTo("Implement"), "block");
writeState("Plan", "no");
check("non-critical needs no release", await advanceTo("Implement"), "allow");

console.log("--- legacy letters and no ACTIVE ---");
writeState("R");
check("legacy letter R still gates a critical effort", await call("write", { path: "src/app.ts", content: "x" }), "block");
setActive(false);
check("no ACTIVE file: writes free", await call("write", { path: "src/app.ts", content: "x" }), "allow");

console.log("--- non-critical effort: warns instead of blocking ---");
setActive(true);
await freshSession();
notices.length = 0;
writeState("Design", "no");
check("code edit at Design (non-critical)", await call("write", { path: "src/app.ts", content: "x" }), "allow");
check("warned once about the non-critical write", notices.length === 1 ? {} : { block: true, reason: `notices=${notices.length}` }, "allow");
check("second write does not warn again", await call("write", { path: "src/other.ts", content: "x" }), "allow");
check("no duplicate warning", notices.length === 1 ? {} : { block: true, reason: `notices=${notices.length}` }, "allow");
check("advances are free for a non-critical effort too", await advanceTo("Plan", "no"), "allow");

console.log("--- sensitive paths force critical ---");
writeState("Design", "no");
check("src/auth/login.ts", await call("write", { path: "src/auth/login.ts", content: "x" }), "block");
check(".github/workflows/ci.yml", await call("write", { path: ".github/workflows/ci.yml", content: "x" }), "block");
check("db/migrations/001_init.sql", await call("write", { path: "db/migrations/001_init.sql", content: "x" }), "block");
check("docs/authorization.md is not a risk", await call("write", { path: "docs/authorization.md", content: "x" }), "allow");
check("notes/auth-notes.txt is not a risk", await call("write", { path: "notes/auth-notes.txt", content: "x" }), "allow");
check("src/util.ts is not sensitive", await call("write", { path: "src/util.ts", content: "x" }), "allow");

fs.writeFileSync(path.join(root, ".qrspi-sensitive-paths"), "# extras\nledger\n");
check("per-repo pattern (ledger) escalates", await call("write", { path: "src/ledger/index.ts", content: "x" }), "block");
fs.rmSync(path.join(root, ".qrspi-sensitive-paths"));

console.log("--- research must not ask the human ---");
writeState("Research", "yes");
await freshSession();
notices.length = 0;
check("questionnaire during Research is not blocked", await call("questionnaire", { questions: [] }), "allow");
check("and it warns", notices.length === 1 ? {} : { block: true, reason: `notices=${notices.length}` }, "allow");
writeState("Design", "yes");
await freshSession();
notices.length = 0;
check("questionnaire at Design does not warn", await call("questionnaire", { questions: [] }), "allow");
check("no warning at Design", notices.length === 0 ? {} : { block: true, reason: `notices=${notices.length}` }, "allow");

console.log("--- a headless child gets no warnings ---");
setActive(true);
await freshSession();
writeState("Design", "no");
notices.length = 0;
const childCtx: any = { ...ctx, hasUI: false };
check("non-critical write from a child", await call("write", { path: "src/app.ts", content: "x" }, childCtx), "allow");
check("and it stays silent", notices.length === 0 ? {} : { block: true, reason: `notices=${notices.length}` }, "allow");

console.log("--- plumbing ---");
check("/qrspi command registered", commands["qrspi"] ? {} : { block: true, reason: "missing" }, "allow");
writeState("Research", "yes");
const subCtx: any = { ...ctx, cwd: path.join(root, "src") };
fs.mkdirSync(path.join(root, "src"), { recursive: true });
check("subdirectory cwd finds ACTIVE", await call("write", { path: "app.ts", content: "x" }, subCtx), "block");

fs.rmSync(root, { recursive: true, force: true }); // leave no fixture behind
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
