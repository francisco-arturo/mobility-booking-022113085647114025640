# AGENTS.md — Prototype: Mobility Booking 022113085647114025640

Brand-led website for a premium transportation and mobility company: service and fleet pages, instant quote and booking flow with live availability, a bookings API ready for a third-party booking platform, and a scalable content structure for future services.

- **Prototype slug**: `mobility-booking-022113085647114025640`
- **Created**: 2026-10-22
- **Kind**: prototype — a bounded experiment, not a production system
- **Workspace root**: `C:\Users\favila\Documents\deepseek-harness\prototypes` (the factory that scaffolded this harness)
- **Harness**: applied at scaffold time by the factory's `new-prototype.ps1` / `new-prototype.sh`

Everything needed to start, verify, and resume work lives inside this directory: `AGENTS.md`
(rules), `feature_list.json` (scope), `progress.md` (state), `session-handoff.md` (continuity),
`init.ps1` / `init.sh` (verification).

## Deploy, not shipping

This prototype came from a **pasted Upwork job post**, and it is **applied with a live URL**: the
client clicks the deployment. Production hardening is not the goal; being deployable and demo-able is.

- **Web-shaped for Vercel from the first commit.** Static assets at the root, or an `api/` serverless
  handler routed by `vercel.json`. **Never a long-running server at the repository root**: Vercel
  auto-detects it, ignores `api/`, and the deployment breaks. Name the local entrypoint something
  else (`dev-server.mjs`) and exclude it in `.vercelignore`.
- **State lives in `/tmp` or in the request.** A deployment's filesystem is read-only.
- **One happy path, walkable in about 60 seconds, on seeded data.** No login wall, no empty first
  screen, no setup step the client could miss.
- **Deploy with one command** from the workspace root:
  `node .harness/deploy.mjs mobility-booking-022113085647114025640` — it honours `.vercelignore`, waits for `READY`, and
  prints the live URL.
- **English only.** UI copy, seed and demo data, comments, docs, error messages, placeholder text and
  the slug itself are English. No mixed-language screens, no untranslated strings carried in from a
  template.
- **`DEMO.md` records the live URL** plus the click path and what is deliberately fake. Keep it
  current as the prototype changes.
- **The workstream order.** Build locally → verify → commit → hand over on localhost → the user
  approves and shares a repository URL → push → `node .harness/deploy.mjs <slug>` → send the
  deployment URL back → proposal. **Nothing is pushed, deployed or proposed before the user approves
  the local build.**
- **The 20-minute rule.** If the build runs past 20 minutes: stop adding scope, get it running, and
  hand over the localhost link for review. No deploy yet.

  ```
  node .harness/build-clock.mjs start     # when the build instruction arrives
  node .harness/build-clock.mjs check     # at every milestone
  ```

- **The 30-minute hard stop: hand over locally.** At 30 minutes the build ships, finished or not.
  Freeze, run verification, commit locally, start it, hand over the localhost link, update `DEMO.md`,
  `progress.md` and `feature_list.json`, and stop. **Wait for approval**: no push, no deploy, no
  proposal. Optional QA such as screenshots never delays this. (The 2026-10-19 "push and deploy at 30
  minutes" instruction is superseded.)


## Startup Workflow

Before writing code:

1. **Confirm working directory** with `pwd` — it must be this prototype directory, not the workspace root.
2. **Read this file** completely.
3. **Read `feature_list.json`** to see which feature is current.
4. **Read the tail of `progress.md`** for what the last session actually did.
5. **Read `session-handoff.md`** if it has content — it names the recommended first action.
6. **Run the verification entrypoint** (see "Verification Commands") to confirm the environment is
   healthy before changing anything.

If baseline verification fails, repair that first before adding new scope.

## Working Rules

- **One feature at a time**: pick exactly one unfinished entry from `feature_list.json`.
- **Verification required**: never claim a feature is done without running the verification entrypoint.
- **Evidence in artifacts**: record the command that ran and its real result in `progress.md`.
- **Stay in scope**: only modify files inside this prototype directory — never sibling prototypes,
  never the workspace factory scripts or the root `prototypes.json` (except through the factory's
  own scripts).
- **Prototype honesty**: prefer the smallest thing that answers the question, and record what was
  learned, not only what was built.
- **Design systems**: if the brief names one, read the workspace reference before styling anything.
  Fable is at `.harness/fable-design-system.md`; apply its clinical-light tone by default and keep a
  design gate in this prototype's verification.
- **Leave a clean, restartable state**: the next session must be able to run the gate immediately.

## Definition of Done

A feature is done only when ALL of the following are true:

- [ ] Target behavior is implemented
- [ ] Verification actually ran (this prototype's entrypoint, plus the workspace gate) and its
      output is recorded
- [ ] Evidence recorded in `feature_list.json` or `progress.md`
- [ ] No files outside this prototype directory were modified
- [ ] This directory remains restartable from the standard startup path

The scaffolded `init.ps1` / `init.sh` detect a package manifest automatically. As soon as this
prototype has a real stack, replace the placeholder verification commands with the real ones —
the placeholder line is the signal that they are not known yet.

Done also means **the demo works**: the path in `DEMO.md` can be walked end to end on the seeded
state, and `DEMO.md` matches what actually happens.

## Verification Commands

```powershell
# Windows, normal shell -- the execution policy on this machine blocks a bare .\init.ps1
powershell -ExecutionPolicy Bypass -File .\init.ps1

# If you cannot execute .ps1 files at all: load it in-process
& ([scriptblock]::Create((Get-Content .\init.ps1 -Raw)))
```

```bash
# bash / WSL / Git Bash
./init.sh
```

Required checks:

- Whatever `init.ps1` / `init.sh` currently run — keep the two scripts in sync, and keep them real.
- Structural score for this directory:
  `node "C:\Users\favila\Documents\deepseek-harness\prototypes\.harness\validate.mjs" --target . --min-score 70`
- Workspace gate (from the workspace root): `node .harness/gate.mjs`

## Environment Constraints

Measured on this machine — the harness is built around them:

- **The execution policy blocks `.ps1` files**; use the bypass form above.
- **Spawning works; capturing and piping native output does not.** `powershell.exe`, `cmd` and
  `git` all run normally here, but a native command's stdout cannot be piped (`... | Select-Object`)
  or redirected (`... > file`); run commands bare and judge them by exit code, and have anything
  that needs parsing write a file.
- **Keep `.ps1` files ASCII-only.** Windows PowerShell 5.1 decodes a BOM-less `.ps1` as ANSI, and a
  single non-ASCII character can break the script outright.

## End of Session

1. Update `progress.md`: current state, commands run, results.
2. Update `feature_list.json` statuses and set the next feature.
3. Fill in `session-handoff.md`: blockers, files touched, next session's first action.
4. Leave this prototype passing its own gate and the workspace gate green.

## Escalation

- **Unclear requirements**: ask the user; do not invent scope.
- **Repeated verification failures**: record the failure in `progress.md` and flag it for human review.
- **Scope ambiguity**: re-read `feature_list.json` — the definition of done is the boundary.
- **Prototype no longer worth keeping**: say so; retirement goes through the factory's
  `retire-prototype.ps1` rather than deleting files ad hoc.
