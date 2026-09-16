# AGENTS.md

How to work in this repo. Read `instruction.md` first. Then this file. Future work lives in `pending.md`. Do not start it until asked.

## Spec

What must be true this turn: a check you can run. If you cannot name it, stop.

## Ship

Commit and open a PR as soon as a check passes. Do not sit on an uncommitted pile. Several small PRs beat one late stack.

Push the branch. Use `gh pr create` if no PR exists. Update the existing PR if it does.

Auto-merge. After the check passes, squash-merge with `gh pr merge --squash`. If checks are still running, `gh pr merge --auto --squash`. Do not wait for the user to say merge.

Do not force-push. Do not skip hooks. Do not commit secrets, `.env`, or `THINK_TOKEN`.

## Every turn

1. Name the spec (test, type, bug, or user-visible result).
2. Name the approach. If the context is two chats or two authors, say you do not know which approach this is.
3. Edit toward this check. Do not replay last week's patch.
4. Run the check. If it fails, do not remember the change.
5. Commit, PR, and merge when the check passes.

## Live

- Site: https://brainweight-production.up.railway.app
- Repo: https://github.com/jawauntb/brainweight
- Local: `npm start` → http://localhost:3000
- `/healthz` must return `ok`
- Railway project: `brainweight`. Deploy from the repo root, not `modal_mind/`.
- Modal app: `brainweight-mind`. `/think` is the deep clock. `/think/mass` is the 1.9e7 weight run.

## Do not

- Copy the lattice-animal app. Borrow principles. Load its compiled connectomes.
- Invent citations. The papers in `instruction.md` are real.
- Call the 47-cell motif a whole fly brain or a human brain.
- Use em dashes. No emojis unless asked. No `console.log` in prod.
- Add a Bro footer. That is the other repo.

## Idioms

Express, no build, `public/*.js`, Fraunces + JetBrains Mono, tissue tokens (`--mind --bound --committed --animal --cream --ink`). Chrome `pointer-events: none` with `auto` on children. `[hidden] { display: none !important }`. `Cache-Control: no-store` on HTML.
