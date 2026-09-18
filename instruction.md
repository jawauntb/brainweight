# instruction

Spec for the next agent. This repo is the ceiling of [lattice-animal](https://github.com/jawauntb/lattice-animal). Lattice-animal stays its own repo. Brainweight is the recursive-depth experiment: stack and loop fly connectomes (same weights, K times) on Modal L4s and watch what emerges.

Docs live with the code. When the mechanic shifts, this file shifts. Do not invent citations. The papers named below are real.

## 1. Why this exists

Lattice-animal animals do not eat each other and do not genetically evolve. They compete only as causal policies in a shared gauge (lion depolarizes, elephant anchors, wolf matches V). Merge exists. Predation, language-cancer, and 2nd-order-self are unbuilt.

The animal is already a higher-order object than a mind. This repo is the next order: the same connectome, stacked and looped, until a new dynamical regime shows up. That regime is reafference, the stack predicting its own next state.

Put simply, we are not growing a bigger fly. We are asking what depth and what population do to one fly motif.

## 2. Scale

Cite these. Do not invent replacements. If a number is an estimate, say so.

**Human brain** (Azevedo et al. 2009 / Herculano-Houzel): ~1508 g, 86 billion neurons.

**Adult *Drosophila* brain volume** (Zheng et al. 2018, *Cell*): ~8e7 μm³ ≈ 0.08 mm³ ≈ ~80 μg wet if density ~1. Wet mass is estimated from volume.

**Acetone-dried** (Posey et al. 2001, adult brain transcript survey): 50 brains = 0.25 mg → ~5 μg dry.

**Heads** (Singh and Harbison 2026, *PLOS One* dimorphism): 30 female heads = 4.05 mg → ~0.135 mg/head. The brain is not the head.

Neuron counts. Do not collapse them:

- FlyWire whole brain 139,255 (Dorkenwald et al. 2024, *Nature*). Female. VNC excluded.
- Male CNS 166,691 (Janelia FlyEM `male-cns:v1.0`). Brain plus nerve cord.
- Isotropic fractionator 199,380 ± 3,400 (Raji and Potter 2021).
- Hemibrain ~25k is not a whole brain. Never scale from it.

**Mass ratio (wet):** 1508 g / 0.08 mg ≈ 1.9e7 fly brains.

**Neuron ratio:** 86e9 / 139255 ≈ 6.2e5.

The gap is the point. Human tissue is half glia by cell count. Fly is ~8% (Raji and Potter: *Drosophila* neurons are 91.8% of brain cells). Stacking copies of a fly motif will not grow a human. Looping the same weights is the other axis.

## 3. Looped transformers

Look the PDFs up if you need them. Write from this.

- **OpenAI Astra (2026 chatter):** recurrent-depth / looped transformer. Same block reused. Raschka 2026-09-02: Nanbeige 4.2 actually shipped this openly. A 22-layer stack run twice. ~75% token efficiency of a unique-layer twin. More passes did not help.
- **Giannou et al. 2023, ICML, "Looped Transformers as Programmable Computers"** (arXiv 2301.13196): freeze a shallow transformer, feed output back as input. Depth of the net does not scale with program length. K loops do. A looped 13-layer net can emulate a computer.
- **Universal Transformers, Dehghani et al. 2018** (arXiv 1807.03819): tied weights across depth, optional ACT halt. Turing-complete with enough memory. Equivalent to a multi-layer transformer with shared parameters.

Mechanic for us: one unit is the compiled fly motif W plus a tiny shared transformer T. N stacked units, vertically coupled (layer i reads i-1; top reaffers into bottom). Each tick, apply the same unit, K times. W first, then T. K is cognitive depth. N is population. Pairing cuts motif copies by half. Emergence is a regime that neither N=1 nor K=1 can make.

## 4. What we will build

Later PRs. This is the queue. Do not start a later tier in this repo until the earlier one exists.

**Tier 0: landed.** `README.md` + `instruction.md`.

**Tier 1: landed.** Beautiful local demo. Express + `public/*.js`, no build. Load compiled `fly-cx.json` (47 / 280, CC-BY Janelia `male-cns:v1.0`). Sliders for K and N. Perspective stack of the heading ring. Nacre on activity. Order, corr, residual. Verse. H hides chrome. Click the ring to set a target. The stack seeks it. Score is `(1 + cos(error)) / 2`. J kicks so stacks desync and must reacquire. A walking target is the idle verb. Telemetry names the live circuit (EPG / PEN / PEG / Delta7 / EL). A thought log is an autopsy of regime, score, and error, not language as the mind. A first gesture arms a compass tone (heading is pitch, score is the interval, residual is roughness). M mutes. Six field notes advance only when the visitor steers, kicks, and sees a real residual. The dock does not eat the ring. After a gesture, `/jev` asks TypeSafe Jev (or a local typed twin) Choice/Score/Noul questions on the stack state and the hint branches on those answers. Set `TYPESAFE_API_KEY` to use the live model. Do not generate text. Do not call Jev before a gesture.

**Tier 2: landed.** Modal app `brainweight-mind`, one L4, scale to zero. 754 / 7200 `modal_mind/fly-deep.json`. Same `/think` proxy as lattice-animal `server.js`. Do not call GPU on first 8s or before first gesture. No websocket.

**Tier 3: landed.** Railway project `brainweight`. Same `railway.json` shape. Live: https://brainweight-production.up.railway.app. `/healthz` → `ok`. Bind `::` and `PORT=3000`.

**Tier 4: landed.** Regimes in `loop.js` classify and `verse.js` banks: traveling waves, second-order prediction, stack desync / fission, language-cancer isolation. Named in verse and `reg` telemetry.

**Ceiling, this cut.** The running stack is 9,425,000 paired units of `fly-cx.json` (47 / 280) plus one shared frozen T (8-d, one head). `/think/mass` forces that N, keeps `v` live, and loops W then T. That is the spec. Pairing is why N is half of 1.9e7. The browser slider is a window (1-8), not the stack. Motif wet grams at that count are 754 g / 80 μg, estimated from Zheng volume, not a weighing. Do not report 1508 g / 1508 g. Do not call the 47-cell motif a whole fly or a human organ. Do not call a wave consciousness.

**Mini GPT, this cut.** `gpt/compare.mjs`: unique-layer twin vs looped fly unit (W then T) on one tiny corpus. Report params and next-token loss. Not a foundation model. Universality (does the GPT grow an EPG-like direction) is still a later column.

**Jev on OpenRouter, this cut.** Jev shipped on OpenRouter in beta (`typesafe/jev-latest`). `server.js` tries `TYPESAFE_API_KEY` against the native systemone endpoint first, then `OPENROUTER_API_KEY` against OpenRouter's chat-completions endpoint (same typed schema, asked for as strict JSON), then the local judge. No key is required to ship; the page works the same on any of the three.

**WebGPU, this cut.** `public/gpu.js` is a fourth tier, alongside the browser window, the deep clock, and `/think/mass`: the visitor's own device stacks and loops W (no T, `pair: false`) at a size read from its own `navigator.gpu` limits, capped at 262,144 units, client-side only. Same gesture rule as the deep clock. Feature-detects `navigator.gpu`, the adapter, and the device; any miss reports `webgpu: unsupported` and leaves every other tier untouched. Do not call this tier the 9.4e6 ceiling; it is a separate, smaller, browser-bound number.

**Ship.** Commit and PR as soon as a check passes. See `AGENTS.md`.

**Pending.** Universality column on the GPT twins. See [`pending.md`](pending.md).

Do not copy the lattice-animal app. Borrow principles. Load its compiled connectomes.

## 5. Design borrow

Env: Node >= 20, Express, compression, `"type": "module"`, `npm start` → `:3000`, Railway healthcheck `/healthz`.

Fonts: Fraunces variable `opsz` for prose, JetBrains Mono for telemetry.

Palette semantics stay tissue. Background stays cool luminous. Warmth is earned by committed / coherent activity only. Tokens: `--mind --bound --committed --animal --cream --ink`.

Chrome: 36px round `action-btn`, `pointer-events: none` on `.chrome` with `auto` on children. `[hidden] { display: none !important }`. No pointer-events holes.

`Cache-Control: no-store` on HTML.

No emojis unless asked. No `console.log` in prod.

Docs live with the code. When the mechanic shifts, the doc shifts.

## 6. First PR constraints

- Files: `README.md` and `instruction.md` only. A one-line `.gitignore` is allowed if the repo is empty. Nothing else.
- This file is `instruction.md`. Not `INSTRUCTIONS_AND_INSPIRATION.md`.
- Short, beautiful, specific. Not a novel. Not a corporate readme.
- No emojis.
- Cite the papers. If a number is an estimate (wet mass from volume), say so.
- Safe-alone: this PR is correct even if no later slice lands.

No app. No CSS. No Modal. No Railway. No connectome JSON. The demo is a later PR.
