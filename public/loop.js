// Looped / stacked fly-connectome engine.
// One compiled motif W. N copies, vertically coupled. Each tick applies W, K times.
// Graph loaded at runtime from /data/fly-cx.json (Janelia male-cns:v1.0, CC-BY).
// Visual N is a window. Human wet-mass equivalent is TARGET_COPIES in mass.js.

import { HUMAN_G, TARGET_COPIES, wetGrams, massFraction, splitGrams } from "./mass.js";

const COUPLE = 0.12;
const TISSUE = 0.05;
const DECAY = 0.80;
const GAIN = 0.072;
const MEAN_PULL = 0.40;
const BUMP_AMP = 0.42;
const BUMP_WIDTH = 3.2;
const NOISE = 0.01;

let memo = null;

export async function load() {
  if (memo) return memo;
  const res = await fetch("/data/fly-cx.json", { cache: "no-store" });
  if (!res.ok) return null;
  memo = await res.json();
  return memo;
}

export function create(graph, { N = 3, K = 4 } = {}) {
  const world = {
    graph,
    N: 1,
    K: clampInt(K, 1, 16),
    epg: epgList(graph),
    seeds: [],
    vs: [],
    residual: 0,
    prevResidual: 0,
    second: 0,
    wave: 0,
    isolate: 0,
    intf: 0,
    lastHeading: 0,
    _pred: null,
    _inc: null,
    _scratch: null,
  };
  setN(world, N);
  return world;
}

export function setN(world, N) {
  const next = clampInt(N, 1, 8);
  const n = world.graph.nodes.length;
  world.N = next;
  for (let i = 0; i < next; i++) {
    if (world.seeds[i] === undefined) world.seeds[i] = seedFor(i);
  }
  world.vs = [];
  for (let i = 0; i < next; i++) {
    world.vs.push(bindStack(world.graph, world.epg, world.seeds[i]));
  }
  world._pred = new Float32Array(n);
  world._inc = new Float32Array(n);
  world._scratch = new Float32Array(next * n);
  world.residual = 0;
}

export function setK(world, K) {
  world.K = clampInt(K, 1, 16);
}

export function step(world) {
  const { vs, N, K, graph, _pred, _inc } = world;
  const n = vs[0].length;
  _pred.set(vs[N - 1]);

  for (let k = 0; k < K; k++) {
    if (N > 1) {
      couple(world);
      tissue(world);
    }
    for (let i = 0; i < N; i++) applyW(vs[i], graph.edges, _inc);
  }

  let sum = 0;
  const after = vs[0];
  for (let i = 0; i < n; i++) {
    const d = _pred[i] - after[i];
    sum += d * d;
  }
  const residual = Math.sqrt(sum / n);
  const safeRes = Number.isFinite(residual) ? residual : 0;
  const prev = world.residual || 0;
  world.second = Math.abs(safeRes - prev);
  world.prevResidual = prev;
  world.residual = safeRes;
}

export function metrics(world) {
  const { order, heading } = epgOrder(world);
  let dH = heading - (world.lastHeading || 0);
  if (dH > Math.PI) dH -= Math.PI * 2;
  if (dH < -Math.PI) dH += Math.PI * 2;
  world.wave = Math.abs(dH);
  world.lastHeading = heading;
  const isolate = isolation(world);
  world.isolate = isolate;
  const corr = meanPairCorr(world);
  const intf = interfere(world);
  world.intf = intf;
  const split = splitGrams(world.N);
  return {
    order,
    corr,
    residual: world.residual,
    second: world.second || 0,
    wave: world.wave || 0,
    isolate,
    intf,
    heading,
    regime: classify(world, order, corr, isolate, intf),
    n: world.graph.nodes.length,
    e: world.graph.edges.length,
    N: world.N,
    K: world.K,
    mass_g: wetGrams(world.N),
    neuron_g: split.neuron_g,
    tissue_g: split.tissue_g,
    human_g: HUMAN_G,
    target_copies: TARGET_COPIES,
    fraction: massFraction(world.N),
  };
}

export function stacks(world) {
  const out = new Array(world.N);
  for (let i = 0; i < world.N; i++) out[i] = { v: world.vs[i] };
  return out;
}

export function nodes(world) {
  return world.graph.nodes;
}

export function epgIndex(world) {
  return world.epg;
}

function epgList(graph) {
  const out = [];
  const list = graph && graph.nodes;
  if (!list) return out;
  for (let i = 0; i < list.length; i++) {
    if (list[i].type === "EPG") out.push(list[i].i);
  }
  return out;
}

function seedFor(i) {
  return (i * 0.6180339887498948 + 0.13) % 1;
}

function bindStack(graph, epg, seed) {
  const list = graph.nodes;
  const n = list.length;
  const v = new Float32Array(n);
  const bumpAt = epg.length ? epg[((seed * epg.length) | 0) % epg.length] : 0;
  const bx = list[bumpAt].x;
  const by = list[bumpAt].y;
  const seedInt = (seed * 997) | 0;
  for (let i = 0; i < n; i++) {
    const nd = list[i];
    const dx = nd.x - bx;
    const dy = nd.y - by;
    v[i] = BUMP_AMP * Math.exp(-(dx * dx + dy * dy) * BUMP_WIDTH)
      + ((i * 13 + seedInt) % 7 - 3) * NOISE;
  }
  return v;
}

function couple(world) {
  const { vs, N, _scratch } = world;
  const n = vs[0].length;
  for (let i = 0; i < N; i++) _scratch.set(vs[i], i * n);
  for (let i = 1; i < N; i++) {
    const dst = vs[i];
    const off = (i - 1) * n;
    for (let j = 0; j < n; j++) dst[j] += COUPLE * _scratch[off + j];
  }
  const top = (N - 1) * n;
  const bottom = vs[0];
  for (let j = 0; j < n; j++) bottom[j] += COUPLE * _scratch[top + j];
}

// Connective analog substrate. Neighbors add and cancel. Not W.
function tissue(world) {
  const { vs, N, _scratch } = world;
  const n = vs[0].length;
  for (let i = 0; i < N; i++) _scratch.set(vs[i], i * n);
  for (let i = 0; i < N; i++) {
    const dst = vs[i];
    const prev = ((i - 1 + N) % N) * n;
    const next = ((i + 1) % N) * n;
    const self = i * n;
    for (let j = 0; j < n; j++) {
      const field = 0.5 * (_scratch[prev + j] + _scratch[next + j]);
      dst[j] += TISSUE * (field - _scratch[self + j]);
    }
  }
}

function interfere(world) {
  const N = world.N;
  if (N < 2) return 0;
  const vs = world.vs;
  const n = vs[0].length;
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const a = vs[i];
    const b = vs[(i + 1) % N];
    let acc = 0;
    for (let j = 0; j < n; j++) acc += a[j] * b[j];
    sum += acc / n;
  }
  const v = sum / N;
  return Number.isFinite(v) ? v : 0;
}

function applyW(v, edges, inc) {
  const n = v.length;
  for (let i = 0; i < n; i++) inc[i] = 0;
  for (let e = 0; e < edges.length; e++) {
    const ed = edges[e];
    inc[ed.t] += tanh(v[ed.s]) * ed.w * ed.sign * GAIN;
  }
  let mean = 0;
  for (let i = 0; i < n; i++) {
    v[i] = v[i] * DECAY + inc[i];
    mean += v[i];
  }
  mean /= n;
  for (let i = 0; i < n; i++) v[i] = clamp1(v[i] - mean * MEAN_PULL);
}

function tanh(x) {
  if (x < -3) return -1;
  if (x > 3) return 1;
  const x2 = x * x;
  return x * (27 + x2) / (27 + 9 * x2);
}

function clamp1(v) {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}

function clampInt(x, lo, hi) {
  const n = Math.round(Number(x));
  if (!Number.isFinite(n)) return lo;
  return n < lo ? lo : n > hi ? hi : n;
}

function epgOrder(world) {
  const v = world.vs[0];
  const list = world.graph.nodes;
  const epg = world.epg;
  const nEPG = epg.length;
  let sx = 0;
  let sy = 0;
  for (let k = 0; k < nEPG; k++) {
    const i = epg[k];
    const nd = list[i];
    sx += v[i] * nd.x;
    sy += v[i] * nd.y;
  }
  let order = nEPG ? Math.hypot(sx, sy) / nEPG : 0;
  if (order < 0) order = 0;
  if (order > 1) order = 1;
  return { order, heading: Math.atan2(sy, sx) };
}

function meanPairCorr(world) {
  const N = world.N;
  if (N === 1) return 1;
  const vs = world.vs;
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      sum += pearson(vs[i], vs[j]);
      pairs++;
    }
  }
  return pairs ? sum / pairs : 1;
}

function isolation(world) {
  const N = world.N;
  if (N < 3) return 0;
  const vs = world.vs;
  let worst = 1;
  for (let i = 0; i < N; i++) {
    let sum = 0;
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      sum += pearson(vs[i], vs[j]);
    }
    const c = sum / (N - 1);
    if (c < worst) worst = c;
  }
  return 1 - worst;
}

function classify(world, order, corr, isolate, intf) {
  const N = world.N;
  const K = world.K;
  if (N === 1 && K === 1) return "both";
  if (N === 1) return "noN";
  if (K === 1) return "noK";
  if (N >= 3 && isolate > 0.55 && corr > 0.45) return "cancer";
  if (corr < 0.38) return "fission";
  if (order > 0.22 && intf < -0.04) return "cancel";
  if (order > 0.22 && (world.wave || 0) > 0.035 && intf > 0.04) return "analog";
  if (order > 0.22 && (world.wave || 0) > 0.035) return "wave";
  if ((world.residual || 0) > 0.10 && (world.second || 0) < 0.03) return "second";
  if ((world.residual || 0) > 0.24) return "lie";
  if (order > 0.30 && (world.residual || 0) < 0.09) return "reaffer";
  if (order > 0.30) return "heading";
  if (corr > 0.75) return "agree";
  return "idle";
}

function pearson(a, b) {
  const n = a.length;
  if (!n) return 1;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  if (den < 1e-12) return 1;
  const r = num / den;
  if (!Number.isFinite(r)) return 1;
  return r < -1 ? -1 : r > 1 ? 1 : r;
}
