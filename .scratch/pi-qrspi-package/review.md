# PR: pi-qrspi package

- **Branch**: `qrspi/pi-qrspi-package`, 26 commits, 7 shipped files
- **Base**: empty repo; the effort starts at the artifacts commit `6234d98`
- **No remote**: `git remote -v` is empty, so nothing is pushed and no MR exists
- **Verdict**: gate green, commit audit clean, review findings applied

## Gate

Run at HEAD `745de6e` on node v22.23.4:

- `npm test` -> 48 PASS, 0 FAIL, `all checks passed`. Bare node, no loader, no `PI_PKG`.
- `node --check extensions/qrspi-gate.ts` -> exit 0.
- `pi -e "$PWD" --no-tools --no-session -p "say ok"` -> stdout `ok`, exit 0, empty stderr.
- Live skill listing -> `<location>/home/maverock24/github/pi-qrspi/skills/qrspi/SKILL.md</location>`,
  which settles research Q6 (a package skill loads from its checkout and the
  absolute path is advertised).
- `diff -u ~/.pi/agent/extensions/qrspi-gate.ts extensions/qrspi-gate.ts` -> 4 hunks:
  `releaseAnswered` helper with both routes, the guarded startup warning, the
  rewired `tool_result` predicate, the reworded block message. Plus the header
  rule 3 text, which the review corrections updated.

## Commit audit

- 26 commits, 26 `QRSPI: pi-qrspi-package` trailers, 0 missing, 0 placeholders.
- `.scratch/ACTIVE` never tracked, at any commit; ignored by `.gitignore:1`.
- 11 effort artifacts tracked and committed with the work.
- Shipped set is exactly `.gitignore`, `README.md`, `docs/AGENTS-snippet.md`,
  `extensions/qrspi-gate.ts`, `package.json`, `skills/qrspi/SKILL.md`,
  `tests/qrspi-gate.test.ts`.
- No dependencies, no devDependencies; `scripts.test` is bare node.
- No credentials; the only matches for the scan terms are prose in comments and
  docs (`tokens` in the context message, `authorization.md` in a test fixture).

## Review findings, and what happened to them

| # | Severity | Finding | Resolution |
|---|---|---|---|
| C1 | MAJOR | The new startup warning fired in every repo, contradicting "no ACTIVE file means no gate" (gate header, `README.md:7`) | Guarded with `findActiveEffort`; README says the warning appears when a live effort exists; assertion added |
| C2 | MAJOR | `README.md` claimed no skill ships, while `skills/qrspi/SKILL.md` does | Reworded to "None of the prerequisites above ships here." |
| C3 | MINOR | Gate header rule 3 and `README.md:11` still named only the questionnaire release route | Both name the `question` route as well |
| C4 | MINOR | Skill line read "`…/SKILL.md` if installed when a module's shape is at stake" | Parenthetical: "if installed (when a module's shape is at stake)" |
| C5 | MINOR | `releaseAnswered` took the `answers[]` branch before checking the tool name, so a `question` result carrying `answers[]` would bypass the question-text guard | Array branch now requires `toolName === "questionnaire"`; assertion added |
| C6 | QUESTION | Plan P5 promised four diff hunks; the measurement is three (the two edits merge) | Plan text corrected, with the reason |

Two of the fixes were proved by mutation: removing the C1 guard fails
`no warning when there is no ACTIVE file`, and unguarding the C5 array branch
fails `a question carrying answers[] does not release`. The gate file's sha256
was identical before and after each mutation.

## Residual limits, documented in the README, not fixed

- Rewriting `state.md` to `Critical: no` ends a block without a human answer.
- The sensitive-path list is a substring match, so `session`, `auth` and
  `crypto` can over-block an unrelated repo. Per-repo mitigation:
  `.qrspi-sensitive-paths`.
- A `bash` write is not gated.
- Co-installing the package next to `~/.pi/agent/extensions/qrspi-gate.ts`
  registers `/qrspi` twice (`qrspi:1` package, `qrspi:2` installed) and runs the
  handlers twice. Documented in the PR notes; not a defect of a single install.

## What the human owns from here

- The GitHub remote and the push.
- Whether to fast-forward `master` to this branch, or open an MR.
- Trying the package on a clean agent dir, which is the one check this machine
  cannot make: it already has the gate installed globally.
