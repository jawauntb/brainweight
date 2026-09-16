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

When Jawaun says to build the mini GPT. Until then, watch the weight run. `AGENTS.md` still applies: commit and PR as soon as a check passes.
