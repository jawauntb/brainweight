# brainweight

How many fly minds you stack and loop before a human-scale thought.

Sibling of [lattice-animal](https://github.com/jawauntb/lattice-animal). That repo stays the living tessellation ([live](https://latticeanimal-production.up.railway.app)). This one is the recursive-depth experiment: same fly connectome, same weights, stacked N times and looped K times, watching for a regime neither axis can make alone.

## The two numbers

**Mass ratio (wet, estimated from volume): ~1.9e7 fly brains per human brain.**
**Neuron ratio (FlyWire whole brain): ~6.2e5.**

Human brain: ~1508 g, 86 billion neurons (Azevedo et al. 2009 / Herculano-Houzel). Adult *Drosophila* brain volume: ~8e7 μm³ ≈ 0.08 mm³ (Zheng et al. 2018, *Cell*). At density ~1 that is ~80 μg wet. The wet mass is an estimate from volume, not a weighing.

Acetone-dried: 50 brains = 0.25 mg, so ~5 μg dry (Posey et al. 2001, adult brain transcript survey). Heads are not brains: 30 female heads = 4.05 mg, ~0.135 mg/head (Singh and Harbison 2026, *PLOS One* dimorphism).

Neuron counts do not collapse into one number:

- FlyWire whole brain: 139,255 (Dorkenwald et al. 2024, *Nature*). Female. VNC excluded.
- Male CNS: 166,691 (Janelia FlyEM `male-cns:v1.0`). Brain plus nerve cord.
- Isotropic fractionator: 199,380 ± 3,400 (Raji and Potter 2021).
- Hemibrain ~25k is not a whole brain. Never scale from it.

The gap is the point. Human tissue is about half glia by cell count. Fly is ~8%. Stacking copies of a fly motif will not grow a human. Looping the same weights is the other axis.

## Same W, K times

This is a looped transformer, not a deeper unique stack. One compiled fly motif W. N stacked copies, coupled. Each tick, apply the same W, K times. Output feeds back as input. K is cognitive depth. N is population.

The lineage is old enough to cite. Universal Transformers tie weights across depth (Dehghani et al. 2018, arXiv 1807.03819). Giannou et al. 2023 (ICML; arXiv 2301.13196) freeze a shallow net and treat K loops as program length. In 2026 the same idea showed up as chatter around OpenAI Astra; Raschka (2026-09-02) notes that Nanbeige 4.2 actually shipped it: a 22-layer stack run twice, ~75% the token efficiency of a unique-layer twin, and more passes did not help.

Emergence here means a dynamical regime that neither a single copy nor a single pass can produce. The one we are watching for is reafference: the stack predicting its own next state.

## Run

```
npm install
npm start
```

http://localhost:3000

Local clock only: the 47-neuron heading motif, every frame. Sliders for K (depth) and N (stacks). H hides chrome. Space pauses.

The Modal L4 clock (754 / 7200, scale to zero) is still later. Do not call GPU on first paint.

Borrow, not a copy of the lattice-animal app: Express, no build, `public/*.js`, Fraunces + JetBrains Mono, tissue palette (`--mind --bound --committed --animal --cream --ink`), `Cache-Control: no-store` on HTML, `/healthz`. No emojis unless asked. No `console.log` in prod.

The next agent executes [`instruction.md`](instruction.md).
