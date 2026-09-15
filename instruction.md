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

Mechanic for us: one compiled fly motif W. N stacked copies, vertically coupled (layer i reads i-1; top reaffers into bottom). Each tick, apply the same W, K times. K is cognitive depth. N is population. Emergence is a regime that neither N=1 nor K=1 can make.

## 4. What we will build

Later PRs. This is the queue. Do not start a later tier in this repo until the earlier one exists.

**Tier 0: this PR.** `README.md` + `instruction.md`. Safe-alone. Correct even if no later slice lands.

**Tier 1: beautiful local demo.** Express + `public/*.js`, no build. Load lattice-animal's compiled `fly-cx.json` (47 neurons / 280 synapses, CC-BY Janelia `male-cns:v1.0`). Sliders for K and N. Perspective stack of the heading ring. Nacre on activity, not decoration. Order parameter (EPG vector length), cross-stack correlation, reafference residual (does stack N predict stack 0 next frame). Verse that keeps up. H hides chrome. Mobile-first.

**Tier 2: Modal, one L4, scale to zero.** 754 / 7200 `fly-deep.json` from `lattice-animal/modal_mind`. Same `/think` proxy pattern as lattice-animal `server.js`. Do not call GPU on first 8s or before first gesture. No websocket (kills scale-to-zero).

**Tier 3: Railway deploy.** Same `railway.json` shape. Cut it up as its own project.

**Tier 4: watch for regimes.** Traveling waves. Second-order prediction. Stack desync / fission. "Language cancer" isolation.

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
