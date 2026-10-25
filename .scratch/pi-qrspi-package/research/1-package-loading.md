# Package loading and skill reachability

Researched against the installed pi 1.4.0. Short roots used below:

- `DOCS` = `/home/maverock24/.nvm/versions/node/v22.23.4/lib/node_modules/@earendil-works/pi-coding-agent/docs`
- `DIST` = `/home/maverock24/.nvm/versions/node/v22.23.4/lib/node_modules/@earendil-works/pi-coding-agent/dist`
- `PM` = `/home/maverock24/github/prompt-manager` (source repo)
- `PM_INSTALLED` = `/home/maverock24/.pi/agent/git/github.com/maverock24/prompt-manager` (installed clone)
- `GATE` = `/home/maverock24/.pi/agent/extensions/qrspi-gate.ts` (the gate source on this machine)

Note on repo state: `/home/maverock24/github/pi-qrspi` has no commits and no code (`git log` fails with "does not have any commits yet"; the tree holds only `.scratch/`). The gate and its tests exist only under `~/.pi/agent/extensions/`.

## Q1

Conventional discovery alone works only for a package that has no `pi` object in `package.json`. The moment a `pi` object exists, it becomes the sole source for all four resource types, even if it declares one of them.

- `DOCS/packages.md:44-55` states that without a `pi` manifest pi discovers extensions, skill directories, prompts and themes from the conventional directories.
- `DIST/core/pi-manifest.js:7-20` returns `null` only when `pkg.pi` is not an object; a `pi` object with unrelated keys yields `{}`, which is truthy.
- `DIST/core/package-manager.js:1865-1872` takes the manifest branch whenever that object is truthy, adds only `manifest[resourceType]` entries and returns; the conventional directory walk at `:1873-1885` is skipped entirely.
- `DIST/core/package-manager.js:1887-1902` (`collectDefaultResources`) does fall back to `join(packageRoot, resourceType)`, so the fallback exists per type, but it is only reached when no `pi` object exists.
- Live example: `/home/maverock24/.pi/agent/npm/node_modules/pi-mcp-adapter/package.json:75-80` declares `pi.extensions` and `pi.video` only, while the package ships `skills/mcp-scripting/SKILL.md`; `mcp-scripting` is absent from this session's `<available_skills>` list.
- `PM/package.json:8-12` declares `pi.extensions` and `pi.prompts` explicitly although `extensions/` and `prompts/` match the conventional names.
- `pi list` prints configured packages and their installed paths, not their resources, so it does not confirm per-resource discovery (`DOCS/cli.md:263`, run output below under Q4).

## Q2

No build step. Extension files are loaded through jiti at runtime, and host packages resolve through an injected alias map, not through the package's own `node_modules`.

- `DOCS/extensions.md:38` says pi uses `jiti`, so TypeScript extensions need no separate compilation step.
- `DIST/core/extensions/loader.js:471-484` creates the jiti instance and calls `jiti.import(extensionPath, { default: true })` for every extension path.
- `DIST/core/extensions/loader.js:38-87` builds the alias map: `@earendil-works/pi-coding-agent`, `pi-agent-core`, `pi-tui`, the `pi-ai` entrypoints, `typebox`, `typebox/compile`, `typebox/value`, and the `@sinclair/typebox` equivalents.
- `DIST/core/extensions/loader.js:42-44` resolves `typebox` from the host install via `require.resolve`.
- `DIST/core/extensions/loader.js:475-479` applies `{ alias: getAliases() }` for the Node build.
- `DIST/core/package-manager.js:1566-1572` clones the repo and, when a `package.json` exists, runs the dependency install in the clone.
- `DIST/core/package-manager.js:1483-1499` shows the git dependency args: npm gets `install --omit=dev --legacy-peer-deps`, bun `--omit=dev --omit=peer`, pnpm disables auto peer install. Peers are deliberately not installed.
- `PM_INSTALLED` contains `package-lock.json` (untracked, created at install time) and no `node_modules` directory, matching a manifest with no `dependencies`.
- `PM/extensions/index.ts:20-21` imports pi types with `import type` and also imports `Type` from `typebox` at runtime, i.e. a host-module runtime import that only works through the alias map.
- Minus: `/home/maverock24/.pi/agent/npm/node_modules/@tintinweb/pi-subagents/package.json:61-64` points `pi.extensions` at `./src/index.ts`, and the installed package carries `src/*.ts` alongside `dist/`, so shipped TypeScript source is what pi loads.
- Minimum pi version: neither `DOCS/packages.md` nor `DOCS/extensions.md` states one, and nothing in the package loader path reads `engines` or checks a peer version (`grep -n engines` over `package-manager.js`, `pi-manifest.js`, `resource-loader.js` returns nothing).
- `/home/maverock24/.pi/agent/npm/node_modules/@tintinweb/pi-subagents/package.json:26-32` declares `>=0.84.0` for the host packages, but that value is not enforced anywhere in the loader, so it is an author claim, not a pi requirement.
- `CHANGELOG.md:478` (section 0.99.0) records that managed git packages stopped auto-installing pi peer dependencies.
- unresolved: no doc or code states a minimum pi version for the `pi` manifest; the only version signal is author-declared `peerDependencies`.

## Q3

A type-only import survives, and `peerDependencies` is not required for the extension to load. The only manifest check pi performs warns when a host package appears in `dependencies`.

- `DIST/core/resource-loader.js:18-29` holds `HOST_PROVIDED_EXTENSION_PACKAGES` (pi packages plus `typebox` and `@sinclair/typebox`).
- `DIST/core/resource-loader.js:32-63` emits a warning only for names found in `manifest.dependencies`; a missing or empty `peerDependencies` produces no diagnostic.
- `DOCS/packages.md:88` asks authors to declare those packages in `peerDependencies` with `"*"`; `DOCS/packages.md:90` says pi warns when they appear in `dependencies`.
- `PM/package.json:1-13` lists neither `dependencies` nor `peerDependencies`, is present in `/home/maverock24/.pi/agent/settings.json:3`, and resolves to an installed path in `pi list`.
- `PM/extensions/index.ts:20` is a pure `import type` for the pi API, and `PM/extensions/index.ts:21` is a runtime `typebox` import; both work because of the alias map at `DIST/core/extensions/loader.js:38-87`.
- `GATE:29-30` imports `import type { ExtensionAPI }` plus `node:fs`, i.e. the zero-runtime-dependency shape, which needs no package-local resolution at all.
- `/home/maverock24/.pi/agent/npm/node_modules/@tintinweb/pi-subagents/package.json:26-32` declares peers with `>=0.84.0` rather than `"*"`, and that package loads, so the `"*"` range is a convention, not an enforced rule.

## Q4

With `pi install git:github.com/<owner>/<repo>` and no `@ref`, the checkout is `~/.pi/agent/git/<host>/<owner>/<repo>`, on the default branch, and it is not pinned: `pi update` moves it to the branch tip.

- `DIST/core/package-manager.js:1795-1807` builds the git install path as `<installRoot>/<host>/<path>`.
- `DIST/core/package-manager.js:1808-1815` sets `installRoot` to `join(this.agentDir, "git")` for user scope and `.pi/git` for project scope.
- `pi list` output on this machine:
  ```
  User packages:
    git:github.com/maverock24/prompt-manager
      /home/maverock24/.pi/agent/git/github.com/maverock24/prompt-manager
  ```
- `DIST/core/package-manager.js:1549-1573` clones the repo and runs `git checkout <ref>` only when a ref was given; with no ref the clone stays on the remote default branch.
- `DIST/core/package-manager.js:1581-1595` handles update: with a ref it fetches that ref; without one it calls `getLocalGitUpdateTarget`.
- `DIST/core/package-manager.js:1283-1322` resolves the clone's `@{upstream}` (falling back to `origin/HEAD`) and fetches `+refs/heads/<branch>:refs/remotes/origin/<branch>`.
- `DIST/core/package-manager.js:1641-1663` (`ensureGitRef`) resets the checkout to the fetched commit when local HEAD differs, so an unpinned package tracks the branch.
- `DOCS/packages.md:38` says git tags and commits are pinned and updates "do not move a configured ref", which is the pinned case only; no `@ref` means no configured ref.
- `PM_INSTALLED` state: `git status -sb` = `## main...origin/main` with one untracked `package-lock.json`, `git log --oneline -1` = `38d48b6`, `git tag` empty, `git describe --tags --always` = `38d48b6`.
- Path stability: for `-e` temporary loads the path is hash-derived and includes the ref, `DIST/core/package-manager.js:1796-1799` plus `:1816-1824`, so those paths differ between refs; the user-scope path above is fixed by host and repo path.

## Q5

`pi install` appends the source string, normalized only for local paths, to the `packages` array in `~/.pi/agent/settings.json`. The entry survives `pi update --extensions` and does not depend on tags.

- `DIST/core/package-manager.js:806-809` (`installAndPersist`) runs install then `addSourceToSettings`.
- `DIST/core/package-manager.js:623-653` appends the normalized source to the package list and writes it through `settingsManager.setPackages`.
- `DIST/core/package-manager.js:1160-1164` returns non-local sources verbatim, so a git source is stored as the string the user typed.
- `/home/maverock24/.pi/agent/settings.json:2-6` holds three plain strings: `git:github.com/maverock24/prompt-manager`, `npm:pi-mcp-adapter`, `npm:@tintinweb/pi-subagents`.
- `DIST/core/package-manager.js:833-859` (`update`) only reads the configured entries to build its work list; nothing in that path writes settings.
- `DIST/core/package-manager.js:876-878` adds every configured git source to the update candidates regardless of pinning, so a tagless repo is still reconciled.
- Empirical: `PM_INSTALLED` has no tags (`git tag` empty) and the entry is still configured and resolved by `pi list`.
- `DOCS/cli.md:276` documents `pi update --extensions`; `DOCS/packages.md:19` names `~/.pi/agent/settings.json` as the personal install target.

## Q6

Skills are not copied anywhere. A package skill stays in the package root, and the absolute path to its `SKILL.md` is what reaches the model, inside the `<location>` element of the skills prompt block.

- `DOCS/skills.md:43` says pi adds each skill's name, description and path to the system prompt, not its instructions.
- `DIST/core/skills.js:278-302` (`formatSkillsForPrompt`) emits `<name>`, `<description>` and `<location>${skill.filePath}</location>`.
- `DIST/core/resource-loader.js:630-635` calls `loadSkills` with `skillPaths` and `includeDefaults: false`, so the paths come from the package resolver.
- `DIST/core/package-manager.js:1875-1881` collects a conventional `skills/` directory with `collectResourceFiles(dir, "skills")`.
- `DIST/core/package-manager.js:207-224` (`collectSkillEntries`) only accepts entries named exactly `SKILL.md` (`:217`), walking subdirectories recursively.
- `DIST/core/package-manager.js:2102-2108` (`addResource`) only records the absolute path and its enabled flag; there is no copy step (`grep -n "copyFile\|cpSync\|cp(" package-manager.js` returns nothing).
- Therefore the advertised path for a git package skill is `~/.pi/agent/git/<host>/<owner>/<repo>/skills/<skill-name>/SKILL.md`, or the manifest-declared directory in place of `skills/`.
- `DOCS/packages.md:72` notes that manifest paths are relative to the package root, which is why manifest-declared skill roots land in the same checkout.
- unresolved: no package installed on this machine currently loads a package skill (`pi-mcp-adapter` ships one but its `pi` manifest suppresses it per Q1, `prompt-manager` has no `skills/`), so the printed `<location>` line was not observed from a live package skill.

## Q7

`ctx.cwd` is the session working directory, not the package root. A package-shipped `.scratch/ACTIVE` is therefore only found when pi is started with a working directory inside the package checkout, and the walk has no repo-root stop.

- `DIST/core/extensions/types.d.ts:213-221` defines `ExtensionContext.cwd` as "Current working directory"; `DOCS/extensions.md:326` says the context provides the working directory.
- `GATE:136-150` (`findActiveEffort`) starts at `path.resolve(cwd)`, reads `<dir>/.scratch/ACTIVE` for 24 hops, and stops only at the filesystem root.
- `GATE:140-142` returns on the first hit, taking the first whitespace-delimited token of the file.
- All call sites pass `ctx.cwd`: `GATE:227`, `GATE:237`, `GATE:255`, `GATE:354`.
- Package checkouts sit under `~/.pi/agent/git/...` (`DIST/core/package-manager.js:1808-1815`) and pi never chdirs into them; nothing in the loader changes the process working directory for a session.
- So a `.scratch/ACTIVE` committed inside `pi-qrspi` would be found only by a session whose cwd is inside `~/.pi/agent/git/github.com/maverock24/pi-qrspi` (or a descendant), where hop 0 or 1 matches.
- unresolved: no fixture run of `session_start` with `cwd` inside a package checkout was performed; the answer above is from the gate source and pi's cwd contract.

## Q8

The absolute references in the qrspi skill do not resolve on a machine that only has the package installed. Two of the three names are absolute paths into the user's own roots, and one is not a path at all.

- `ls -la /home/maverock24/.agents/skills` shows `grilling -> /home/maverock24/github/skills/skills/productivity/grilling`, `codebase-design -> /home/maverock24/github/skills/skills/engineering/codebase-design`, `code-review -> /home/maverock24/github/skills/skills/engineering/code-review`, and `qrspi` as a real directory (`drwxr-xr-x ... qrspi`).
- `/home/maverock24/.agents/skills/qrspi/SKILL.md:134` names `~/.agents/skills/grilling/SKILL.md` and then `codebase-design/SKILL.md` with no leading path.
- `/home/maverock24/.agents/skills/qrspi/SKILL.md:144` names `~/.agents/skills/code-review/SKILL.md`.
- The three symlink targets live under `/home/maverock24/github/skills`, i.e. a separate clone, so a package-only install has nothing at those paths.
- `codebase-design/SKILL.md` is a bare relative-looking token, so it resolves against whatever directory the reader assumes, not against `~/.agents/skills`.
- Pi does support `~/.agents/skills/` as a skill root (`DOCS/skills.md:61`, `DIST/core/package-manager.js:2023`, `:2064`), which is why those names appear in this session's skill list, but that is the user's machine state, not something the package brings.

## Q9

A package skill wins a name collision against `~/.agents/skills/qrspi`, and the loser is dropped with a collision diagnostic.

- `DOCS/skills.md:85` says name collisions keep the first discovered skill and produce a warning.
- `DIST/core/skills.js:320-347` keeps the first skill per name in a `Map` and pushes a `{ type: "collision", message: 'name "<name>" collision', path, collision: { resourceType, name, winnerPath, loserPath } }` diagnostic for the later one.
- `DIST/core/skills.js:328-331` skips only exact duplicate real paths, so two different directories with the same skill name collide.
- Order is: packages first, then settings-declared paths, then auto-discovered directories. `DIST/core/package-manager.js:718` resolves packages before `:721-736` local entries, and `:736` calls `addAutoDiscoveredResources` last.
- Within packages, project scope is pushed before user scope (`DIST/core/package-manager.js:708-717`).
- User auto-discovery adds `~/.pi/agent/skills` (`DIST/core/package-manager.js:2057`) and `~/.agents/skills` (`:2064`), both after the package paths, so `~/.agents/skills/qrspi` loses to a package `qrspi`.
- `DIST/core/package-manager.js:2102-2108` preserves insertion order in the per-type `Map`, and `DIST/core/resource-loader.js:630-635` passes that order to `loadSkills`, which is why "first" means "package first".
- The only way to prefer the user copy is to stop the package skill from loading, via a package filter or `-ns` (`DOCS/packages.md:96-119`, `DOCS/cli.md:202`), which is a fact about the mechanism, not a recommendation.
- unresolved: the TUI rendering of the collision diagnostic was not observed; no run with two same-named skills was executed, so the surfaced text is unverified beyond `DOCS/skills.md:85`.
