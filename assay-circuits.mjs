// Assay: circuit family metrics and heading equivariance under seed change.
// Node ESM script. Loads fly-cx.json from disk (no fetch), exercises loop.js.
// Exit 0 and print PASS on success. Exit 1 on any failure.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { create, setN, step, metrics, injectHeading, kick, wander, setTarget, applyW, applyT, CIRCUIT_JOB, familyOf, attnMatrix } from "./public/loop.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const graphPath = join(__dirname, "public", "data", "fly-cx.json");

function fail(msg) {
  process.stderr.write(`FAIL: ${msg}\n`);
  process.exit(1);
}

const CIRCUITS = ["epg", "pen", "peg", "delta7", "el"];

function loadGraph() {
  let raw;
  try {
    raw = readFileSync(graphPath, "utf8");
  } catch (err) {
    fail(`could not read ${graphPath}: ${err.message}`);
  }
  let graph;
  try {
    graph = JSON.parse(raw);
  } catch (err) {
    fail(`could not parse fly-cx.json: ${err.message}`);
  }
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    fail("fly-cx.json missing nodes/edges");
  }
  return graph;
}

function assayMetrics(graph) {
  const world = create(graph, { N: 3, K: 4 });
  for (let i = 0; i < 12; i++) step(world);
  const m = metrics(world);

  for (const key of CIRCUITS) {
    const v = m[key];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      fail(`metrics().${key} is not finite: ${v}`);
    }
  }
  if (typeof m.circuit !== "string" || CIRCUITS.indexOf(m.circuit) === -1) {
    fail(`metrics().circuit is not one of ${CIRCUITS.join("|")}: ${m.circuit}`);
  }
  for (const key of CIRCUITS) {
    if (!CIRCUIT_JOB[key] || CIRCUIT_JOB[key].length < 12) fail(`CIRCUIT_JOB.${key} is missing`);
    if (/human brain/i.test(CIRCUIT_JOB[key]) && !CIRCUIT_JOB[key].includes("not a human")) {
      fail(`CIRCUIT_JOB.${key} claims a human brain`);
    }
  }
  if (familyOf("EPG") !== "epg") fail("familyOf(EPG) is not epg");
  if (familyOf("PEN_a") !== "pen") fail("familyOf(PEN_a) is not pen");
  if (familyOf("Delta7") !== "delta7") fail("familyOf(Delta7) is not delta7");

  process.stdout.write(
    `metrics: epg=${m.epg.toFixed(4)} pen=${m.pen.toFixed(4)} peg=${m.peg.toFixed(4)} ` +
      `delta7=${m.delta7.toFixed(4)} el=${m.el.toFixed(4)} circuit=${m.circuit}\n`
  );
}

function headingFor(graph, seed0) {
  const world = create(graph, { N: 1, K: 4 });
  world.seeds[0] = seed0;
  setN(world, 1);
  for (let i = 0; i < 8; i++) step(world);
  return metrics(world).heading;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

function assayEquivariance(graph) {
  const hA = headingFor(graph, 0.12);
  const hB = headingFor(graph, 0.62);
  const diff = angleDiff(hA, hB);

  process.stdout.write(
    `equivariance: heading(0.12)=${hA.toFixed(4)} heading(0.62)=${hB.toFixed(4)} diff=${diff.toFixed(4)}\n`
  );

  if (!Number.isFinite(diff)) fail("heading diff is not finite");
  if (diff < 0.25) fail(`heading diff ${diff.toFixed(4)} below 0.25 rad threshold`);
}

function assaySteer(graph) {
  const world = create(graph, { N: 3, K: 4 });
  for (let i = 0; i < 8; i++) step(world);
  injectHeading(world, 0, 0.75, true);
  if (world.gesture !== "steer") fail("injectHeading did not mark steer");
  for (let i = 0; i < 5; i++) step(world);
  const m0 = metrics(world);
  const d0 = angleDiff(m0.heading, 0);
  if (d0 > 0.85) fail(`steer 0 landed at ${m0.heading.toFixed(4)} (diff ${d0.toFixed(4)})`);

  injectHeading(world, Math.PI, 0.75, true);
  for (let i = 0; i < 5; i++) step(world);
  const m1 = metrics(world);
  const d1 = angleDiff(m1.heading, Math.PI);
  if (d1 > 0.95) fail(`steer pi landed at ${m1.heading.toFixed(4)} (diff ${d1.toFixed(4)})`);
  if (angleDiff(m0.heading, m1.heading) < 0.45) {
    fail("steer did not move heading");
  }
  process.stdout.write(
    `steer: heading(0)=${m0.heading.toFixed(4)} heading(pi)=${m1.heading.toFixed(4)}\n`
  );
}

function assayKick(graph) {
  const world = create(graph, { N: 4, K: 4 });
  for (let i = 0; i < 24; i++) step(world);
  const before = metrics(world).corr;
  kick(world);
  if (world.gesture !== "kick") fail("kick did not mark gesture");
  const after = metrics(world);
  if (after.corr > 0.82) {
    fail(`kick corr ${after.corr.toFixed(4)} still locked (was ${before.toFixed(4)})`);
  }
  process.stdout.write(`kick: corr ${before.toFixed(3)} -> ${after.corr.toFixed(3)}\n`);
}

function assayWander(graph) {
  const world = create(graph, { N: 3, K: 4 });
  for (let i = 0; i < 8; i++) step(world);
  const h0 = metrics(world).heading;
  world.quiet = 36;
  world.gesture = null;
  world.gestureFrames = 0;
  world.drive = h0;
  for (let i = 0; i < 60; i++) {
    wander(world);
    step(world);
  }
  const h1 = metrics(world).heading;
  const diff = angleDiff(h0, h1);
  if (diff < 0.22) fail(`wander did not walk heading (diff ${diff.toFixed(4)})`);
  process.stdout.write(
    `wander: ${h0.toFixed(4)} -> ${h1.toFixed(4)} diff=${diff.toFixed(4)}\n`
  );
}

function assaySeek(graph) {
  const world = create(graph, { N: 3, K: 4 });
  for (let i = 0; i < 6; i++) step(world);
  const before = metrics(world);
  setTarget(world, Math.PI);
  if (world.gesture !== "target") fail("setTarget did not mark target");
  for (let i = 0; i < 40; i++) step(world);
  const after = metrics(world);
  if (after.score < 0.55) {
    fail(`seek score ${after.score.toFixed(4)} below 0.55 (was ${before.score.toFixed(4)})`);
  }
  if (angleDiff(after.heading, Math.PI) > 1.05) {
    fail(`seek heading ${after.heading.toFixed(4)} not near pi`);
  }
  process.stdout.write(
    `seek: score ${before.score.toFixed(3)} -> ${after.score.toFixed(3)} ` +
      `heading=${after.heading.toFixed(3)} err=${after.error.toFixed(3)}\n`
  );
}

function assayGlia(graph) {
  const on = create(graph, { N: 3, K: 4 });
  on.glia = true;
  on.gliaFrac = 0.5;
  for (let i = 0; i < 6; i++) step(on);
  for (let i = 0; i < 10; i++) {
    for (let s = 0; s < on.N; s++) on.vs[s].fill(0.92);
    step(on);
  }
  const mOn = metrics(on);
  if (mOn.gain <= 0.072 + 1e-6) {
    fail(`glia on: gain ${mOn.gain} did not rise above 0.072`);
  }
  if (mOn.g <= 0) fail(`glia on: g ${mOn.g} is not positive`);

  const off = create(graph, { N: 3, K: 4 });
  off.glia = false;
  for (let i = 0; i < 6; i++) step(off);
  for (let i = 0; i < 10; i++) {
    for (let s = 0; s < off.N; s++) off.vs[s].fill(0.92);
    step(off);
  }
  const mOff = metrics(off);
  if (Math.abs(mOff.gain - 0.072) > 1e-6) {
    fail(`glia off: gain ${mOff.gain} should stay 0.072`);
  }
  process.stdout.write(
    `glia: on gain=${mOn.gain.toFixed(4)} g=${mOn.g.toFixed(3)} ` +
      `off gain=${mOff.gain.toFixed(4)}\n`
  );
}

function assayDepth(graph) {
  const deep = create(graph, { N: 3, K: 4 });
  for (let i = 0; i < 6; i++) step(deep);
  const m = metrics(deep);
  if (!Array.isArray(m.passes) || m.passes.length !== 4) {
    fail(`passes length ${m.passes && m.passes.length}, want 4`);
  }
  for (let i = 0; i < m.passes.length; i++) {
    if (!Number.isFinite(m.passes[i])) fail(`passes[${i}] is not finite`);
  }
  if (!Number.isFinite(m.depth)) fail(`depth ${m.depth} is not finite`);

  const shallow = create(graph, { N: 3, K: 1 });
  for (let i = 0; i < 4; i++) step(shallow);
  const one = metrics(shallow);
  if (!Array.isArray(one.passes) || one.passes.length !== 1) {
    fail(`K=1 passes length ${one.passes && one.passes.length}, want 1`);
  }
  if (one.depth !== 0) fail(`K=1 depth ${one.depth} is not 0`);

  process.stdout.write(
    `depth: K4 passes=${m.passes.map((v) => v.toFixed(3)).join(",")} ` +
      `work=${m.depth.toFixed(4)} K1=${one.passes[0].toFixed(3)}\n`
  );
}

function assayMix(graph) {
  const paired = create(graph, { N: 1, K: 4 });
  for (let i = 0; i < 6; i++) step(paired);
  const m = metrics(paired);
  if (!Number.isFinite(m.mix)) fail(`mix ${m.mix} is not finite`);
  if (m.mix < 0.12) fail(`mix ${m.mix} is too low; T is sitting on W`);
  if (m.mix > 0.98) fail(`mix ${m.mix} is a random soup`);
  const attn = attnMatrix(paired);
  const n = graph.nodes.length;
  if (!attn || attn.length !== n * n) fail("attn matrix missing after a paired step");
  let row = 0;
  for (let j = 0; j < n; j++) row += attn[j];
  if (Math.abs(row - 1) > 0.05) fail(`attn row 0 sums to ${row}, not 1`);

  const naked = create(graph, { N: 1, K: 1 });
  naked.pair = false;
  step(naked);
  const off = metrics(naked);
  if (off.mix !== 0) fail(`W-only mix ${off.mix} should be 0`);

  process.stdout.write(`mix: paired=${m.mix.toFixed(3)} w-only=${off.mix.toFixed(3)}\n`);
}

function assayPair(graph) {
  const world = create(graph, { N: 3, K: 4 });
  const m0 = metrics(world);
  if (m0.pair !== true) fail("metrics().pair is not true");

  const n = graph.nodes.length;
  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const seed = ((i * 17) % 11) / 11;
    a[i] = seed;
    b[i] = seed;
  }
  const inc = new Float32Array(n);
  const buf = {
    q: new Float32Array(n * 8),
    k: new Float32Array(n * 8),
    vp: new Float32Array(n * 8),
    score: new Float32Array(n),
  };
  applyW(a, graph.edges, inc, 0.072);
  applyW(b, graph.edges, inc, 0.072);
  applyT(b, graph.nodes, buf);
  let diff = 0;
  for (let i = 0; i < n; i++) diff += Math.abs(a[i] - b[i]);
  if (diff < 1e-4) fail(`W and W+T agree (L1 ${diff}); the pair is decoration`);

  const on = create(graph, { N: 1, K: 4 });
  for (let i = 0; i < 8; i++) step(on);
  const mOn = metrics(on);
  if (mOn.residual < 1e-6) fail(`paired residual ${mOn.residual} is a lock, not a step`);

  const seedV = new Float32Array(n);
  for (let i = 0; i < n; i++) seedV[i] = ((i * 13) % 7 - 3) * 0.08;
  const wOnly = create(graph, { N: 1, K: 1 });
  const wPair = create(graph, { N: 1, K: 1 });
  wOnly.pair = false;
  wPair.pair = true;
  wOnly.vs[0].set(seedV);
  wPair.vs[0].set(seedV);
  step(wOnly);
  step(wPair);
  let stepDiff = 0;
  for (let i = 0; i < n; i++) stepDiff += Math.abs(wOnly.vs[0][i] - wPair.vs[0][i]);
  if (stepDiff < 1e-4) fail(`paired step matches W-only (L1 ${stepDiff})`);

  process.stdout.write(
    `pair: L1(W,W+T)=${diff.toFixed(4)} residual=${mOn.residual.toFixed(4)} ` +
      `stepL1=${stepDiff.toFixed(4)}\n`
  );
}

const html = readFileSync(join(__dirname, "public", "index.html"), "utf8");
if (!html.includes("id=\"atlas\"")) fail("index.html missing circuit atlas");
if (!html.includes("id=\"t-mix\"")) fail("index.html missing mix telemetry");

const graph = loadGraph();
assayMetrics(graph);
assayEquivariance(graph);
assaySteer(graph);
assayKick(graph);
assayWander(graph);
assaySeek(graph);
assayGlia(graph);
assayDepth(graph);
assayMix(graph);
assayPair(graph);

process.stdout.write("PASS\n");
