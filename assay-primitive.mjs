// Assay: loop a unit on itself and it stops. brainweight's own step(), run
// undriven (no seek, no glia), against the numbers lattice-animal compiled
// into its public/data/primitive.json (the primitive lattice animal unit).
// Exit 0 and print PASS. Exit 1 on any failure.
//
// Measured, not proved. The claim: with N >= 2 the W-then-T pass has nonzero
// fixed points with every layer equal, so K changes nothing there; a lone
// layer (N = 1) decays to zero. There are two stable ones, a twin about
// 6e-4 apart, each with a minus clock half a turn away on the ring.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { create, setN, step, stacks, nodes, epgIndex } from "./public/loop.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const graph = JSON.parse(readFileSync(join(__dirname, "public", "data", "fly-cx.json"), "utf8"));

// lattice-animal public/data/primitive.json, v1: |p|, its twin's |p|, heading.
const REF = { norm: 1.526614, twinNorm: 1.52449, heading: -0.112281, tol: 2e-4 };

function fail(msg) {
  process.stderr.write(`FAIL: ${msg}\n`);
  process.exit(1);
}

function relax(N, K, seed) {
  const world = create(graph, { N, K });
  world.glia = false;
  world.gesture = "kick";
  world.gestureFrames = 1e9;
  for (let i = 0; i < N; i++) world.seeds[i] = (seed + 0.29 * i) % 1;
  setN(world, N);
  let prev = null;
  let delta = Infinity;
  for (let t = 0; t < 6000; t++) {
    step(world);
    const flat = new Float32Array(N * graph.nodes.length);
    stacks(world).forEach((s, i) => flat.set(s.v, i * graph.nodes.length));
    if (prev) {
      let sum = 0;
      for (let i = 0; i < flat.length; i++) {
        const d = flat[i] - prev[i];
        sum += d * d;
      }
      delta = Math.sqrt(sum / flat.length);
    }
    prev = flat;
    if (t > 5 && delta < 1e-9) break;
  }
  const v = stacks(world)[0].v;
  let sq = 0;
  for (let i = 0; i < v.length; i++) sq += v[i] * v[i];
  let hx = 0;
  let hy = 0;
  const nd = nodes(world);
  for (const i of epgIndex(world)) {
    hx += nd[i].x * v[i];
    hy += nd[i].y * v[i];
  }
  let gap = 0;
  const top = stacks(world)[N - 1].v;
  for (let i = 0; i < v.length; i++) gap = Math.max(gap, Math.abs(top[i] - v[i]));
  return { norm: Math.sqrt(sq), heading: Math.atan2(hy, hx), delta, gap };
}

const lone = relax(1, 3, 0.37);
if (lone.norm > 1e-3) fail(`N=1 did not decay to zero (norm ${lone.norm})`);

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const seen = new Set();
const rows = [];
for (const N of [2, 3, 4]) {
  for (const K of [1, 3, 8]) {
    for (const seed of [0.37, 0.05, 0.8]) {
      const r = relax(N, K, seed);
      if (!(r.delta < 1e-8)) fail(`N=${N} K=${K} seed=${seed} did not settle (delta ${r.delta})`);
      const isMain = Math.abs(r.norm - REF.norm) < REF.tol;
      const isTwin = Math.abs(r.norm - REF.twinNorm) < REF.tol;
      if (!isMain && !isTwin) fail(`N=${N} K=${K} seed=${seed} landed on |p|=${r.norm}, not ${REF.norm} or ${REF.twinNorm}`);
      const off = Math.min(Math.abs(wrap(r.heading - REF.heading)), Math.abs(wrap(r.heading - REF.heading - Math.PI)));
      if (off > 5e-3) fail(`N=${N} K=${K} seed=${seed} heading ${r.heading} is on neither clock`);
      if (r.gap > 1e-5) fail(`N=${N} K=${K} seed=${seed}: layers differ at the fixed point (${r.gap})`);
      seen.add(isMain ? "main" : "twin");
      rows.push(`N${N}K${K}`);
    }
  }
}

process.stdout.write(
  `primitive: N=1 norm=${lone.norm.toExponential(1)} (decays); N>=2 ${rows.length} runs on |p| ${REF.norm} or ${REF.twinNorm} ` +
    `(${[...seen].sort().join("+")}), heading ${REF.heading} or +pi, layers equal\n`
);
process.stdout.write("PASS\n");
