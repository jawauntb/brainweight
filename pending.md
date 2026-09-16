# pending

Handoff. Do not start these until asked. The live ceiling is the 1.9e7 tissue run. This file is the next queue.

## Mini GPT, same W vs unique layers

Use the stack, then compare it to a transformer.

Build a tiny GPT (character or byte, one file, no product chrome). Two twins:

1. **Unique.** Ordinary blocks. Each layer has its own weights. Depth is layer count.
2. **Looped.** One block, the fly motif W, applied K times. Same mechanic as this repo. Optional N stacks with the tissue field.

Same data. Same tokenizer. Same train steps. Report two columns: next-token loss, and (for the looped twin) `residual`, `intf`, `wave`, `reg`.

The point is the comparison already named in `instruction.md`. Universal Transformers tie weights across depth (Dehghani et al. 2018, arXiv 1807.03819). Giannou et al. 2023 (arXiv 2301.13196) treat K loops as program length. Nanbeige 4.2 ran a 22-layer stack twice (Raschka 2026-09-02). Ask whether the heading motif, looped, can sit in a GPT and still show a regime the unique twin cannot, at the same parameter count.

### Check that would settle it

A table. Params, FLOPs per token, loss. For the looped twin, K and the regime names we already use. If loss matches the unique twin at fewer unique weights, say so. If a wave or reafference shows up only when K>1 or N>1, say so. If nothing shows, say that.

### What we are not doing

- Not a big LLM. Mini means it trains on a laptop or one L4.
- Not a claim that the fly motif is a foundation model.
- Not a new citation. Use the papers already in `instruction.md`.
- Not a rewrite of the live demo. Keep Express, no build, `/think` and `/think/mass` as they are. The GPT is a sibling script or a later page.

### When to start

When Jawaun says to build the mini GPT. Until then, watch the weight run. `AGENTS.md` still applies: commit, PR, and merge as soon as a check passes.

## Glia as a computational substrate

`TISSUE` now is not glia. It is a discrete Laplacian: each stack is pulled toward its neighbors. That is a syncytium, extracellular diffusion. Useful. Incomplete.

Glia are a second cell class. Fly: ~8.2% of brain cells (Raji and Potter 2021). Human: about half. They do not run W. They change whether W is allowed to run.

Proxy them as one slow field `g`, not as extra motif copies.

1. **Slow.** Update `g` once per tick, not K times. Neurons loop. Glia do not.
2. **Own graph.** `g` couples only to neighbor `g`. No edges from `fly-cx.json`. Gap-junction astrocyte net.
3. **Gate, do not store.** `GAIN_eff = GAIN * (1 + α * g)` or `W_eff = W * σ(g)`. The motif stays the store. Glia scale it. That is the tripartite-synapse proxy.
4. **Homeostasis.** If mean `|v|` is high, `g` rises and `DECAY` or `MEAN_PULL` rises. That is K+ / glutamate uptake: keep the soup livable.

Miller, Brincat, and Roy 2026 still holds: W stores, the slow field is control. Measure `intf` on `v` after `g` has gated it. A human-weight run can raise the `g` fraction toward 0.5 without adding neurons. Label that an estimate from cell counts, not a weighing.

### Check that would settle it

N=3, K=4. With `g`, effective gain moves when activity is high. Without `g`, it does not. At 1.9e7 copies, a fly-fraction run (`g` ~ 0.08) and a human-fraction run (`g` ~ 0.5) return different `intf` / `wave` / `reg`. If they do not, the proxy is decoration.

### When to start

When Jawaun says to build the glia field. Do not replace `TISSUE` until that check is written.

## Analogous circuits (Olah)

Chris Olah, Cammarata, Schubert, Goh, Petrov, and Carter (2020, Distill, "Zoom In: An Introduction to Circuits", doi:10.23915/distill.00024.001) make three claims. Features are directions. Features plus weights are circuits. Analogous features and circuits form across models and tasks (universality). They also name recurring motifs: equivariant circuits (curve detectors rotate with orientation), unioning over cases (left and right pathways inhibit, then an invariant unit), and superposition (more features than neurons, packed almost-orthogonally). They say the universality evidence was still anecdotal. Keep that label.

The fly motif is already a circuit, not a soup. The compile note in `fly-cx.json` names it: EPG compass, PEN shift, PEG feedback, Delta7 inhibition, EL. That is the same grain as a Distill curve detector. Do not wait for a GPT to start reading it that way.

### What to do with it here

1. **Name the subgraphs.** Telemetry per cell type, not only `order` / `corr`. An EPG bump is a feature. Delta7 is the inhibit-sharpen. PEN is a shift. If `reg` cannot say which subgraph did the work, the atlas is missing.

2. **Equivariance assay.** Rotate the heading. Activity on the EPG ring should rotate. The weights already have that symmetry if the compass is real. This is Olah's curve-detector test, run on a fly ring. Hubel and Wiesel orientation tuning is the neuroscience version they already borrowed.

3. **Superposition at weight.** 47 neurons cannot own 1.9e7 independent thoughts. If extra features appear, they are packed across stacks, not as new cells. A cheap dictionary (or even cluster of stack states) at N=1.9e7 is the car-on-dog-detector test. Polysemantic stacks are allowed. Do not call them a bigger fly.

4. **Universality is the mini-GPT check.** Loss is not enough. The unique-layer twin and the looped-W twin should be scored on whether the same circuit shows up: a heading bump, an inhibit-sharpen, a shift. If the unique GPT grows an EPG-like direction and a Delta7-like oppose, that is claim 3. If only loss matches, that is compression, not an analogous structure.

5. **Glia sit outside the circuit.** Olah's circuits live in W. `g` is a gate, not a feature in the motif. Do not dictionary-learn `g` as if it were an EPG. Measure `g` as control on whether the named circuit is allowed to fire.

### Check that would settle it

A short atlas: EPG / PEN / PEG / Delta7 / EL each have a one-line job and a metric. Rotating heading moves the EPG metric around the ring. A later mini-GPT table includes a column "analogous circuit found?" with yes/no per subgraph, not only loss. If the column is all no, say universality failed here. Do not upgrade the Distill anecdote into a proof.

### When to start

The atlas can start on the live motif without a GPT. The universality column waits for the mini-GPT cut. Do not build a Distill-style UI. Name the circuits in telemetry and verse first.
