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

Emergence here means a dynamical regime that neither a single copy nor a single pass can produce. Reafference is one: the stack predicting its own next state. Another is analog interference (Miller, Brincat, and Roy 2026, *Journal of Neuroscience*, doi:10.1523/JNEUROSCI.0711-26.2026): W stores the motif, a connective tissue field lets neighboring stacks add or cancel. Telemetry `intf` is that sum. Positive is constructive. Negative is cancel.

The wet-mass estimate already includes connective tissue, glia, and neuropil. Zheng's volume is the whole organ, not neurons alone. The cell-count split is labeled: fly neurons are 91.8% of brain cells (Raji and Potter 2021). That is not a weighing. Human tissue is about half glia. Motif-full at 1.9e7 would be those grams. This cut pairs a tiny transformer with each motif, so the live stack is 9.4e6 units and about 754 g of motif, not 1508 g of a human brain.

## Run

```
npm install
npm start
```

http://localhost:3000

Live: [brainweight-production.up.railway.app](https://brainweight-production.up.railway.app)

The live stack is 9,425,000 units on one L4. One unit is the 47-cell motif W plus a shared tiny transformer T (8-d, one head, frozen). That is the spec. Pairing cuts motif copies by half. The rings are a window (at most 8). Drag the ring to point. J kicks. M mutes. A first gesture arms a compass tone and a seven-beat field note: ring attractor, corollary discharge, W+T, residual, Miller 2026 analog interference, then the mass honesty. After that same gesture, Jev (TypeSafe System One) judges the stack as typed decisions: next verb, lock-versus-miss, whether residual is a thought, why the frame matters. The hint is those answers composed in code. Residual after each of the K W+T passes is a depth tape. Jev also names the live dynamical fact and whether both population and depth were needed. That is an echo or a wave, not a mind. The ring is colored by the named fly subgraphs. The atlas line is the job of whichever one is hottest. The front ring draws W's synapses (cool) and T's attention (warm). `mix` is how much of that attention sits off the wiring. Warm filaments from the top copy to the floor are per-cell prediction error. The echo line says echo or miss, not mind. Jev now answers from three places, tried in order: a `TYPESAFE_API_KEY` against the native systemone endpoint, an `OPENROUTER_API_KEY` against `typesafe/jev-latest` on OpenRouter (Jev shipped there in beta), then a local judge with the same schema if neither key is set or both are down. After a gesture and 8s, `/think/mass` keeps that 9.4e6 stack live and steps W then T. N in telemetry is 9.4e6. Motif wet mass at that count is 754 g / 80 μg, estimated from Zheng volume, not a weighing. The motif is not a whole fly. Stacking it does not grow human tissue.

Deep clock: Modal L4 on `modal_mind/fly-deep.json` (754 / 7200), proxied at `/think`. Scale to zero. No GPU on first paint, in the first 8s, or before a gesture. No websocket.

A visitor's own device joins too. `public/gpu.js` is a WebGPU tier: after the same first gesture, a visitor's own GPU stacks and loops the motif W (no T, `pair: false`) at a size picked from `navigator.gpu`'s own limits, up to 262,144 units, entirely client-side, no server round trip. Same rule as the deep clock: no GPU before a gesture. Any browser without `navigator.gpu`, an adapter, or a device just reports `webgpu: unsupported` and every other tier is unaffected.

Borrow, not a copy of the lattice-animal app: Express, no build, `public/*.js`, Fraunces + JetBrains Mono, tissue palette (`--mind --bound --committed --animal --cream --ink`), `Cache-Control: no-store` on HTML, `railway.json` + `/healthz`. No emojis unless asked. No `console.log` in prod.

Assay: `npm run assay` runs the mass/pair check, the circuit/seek/glia check, the play/learn check, the Jev schema and OpenRouter-fallback check, the WebGPU fallback and diagnostics-math check, and the mini-GPT twins (unique layers vs looped W+T on the same tiny corpus).

The next agent executes [`instruction.md`](instruction.md) and [`AGENTS.md`](AGENTS.md). What is still parked lives in [`pending.md`](pending.md).
