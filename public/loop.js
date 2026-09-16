// Looped / stacked fly-connectome engine.
// One compiled motif W. N copies, vertically coupled. Each tick applies W, K times.
// Graph loaded at runtime from /data/fly-cx.json (Janelia male-cns:v1.0, CC-BY).

const COUPLE = 0.12;
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
    if (N > 1) couple(world);
    for (let i = 0; i < N; i++) applyW(vs[i], graph.edges, _inc);
  }

  let sum = 0;
  const after = vs[0];
  for (let i = 0; i < n; i++) {
    const d = _pred[i] - after[i];
    sum += d * d;
  }
  const residual = Math.sqrt(sum / n);
  world.residual = Number.isFinite(residual) ? residual : 0;
}

export function metrics(world) {
  const { order, heading } = epgOrder(world);
  return {
    order,
    corr: meanPairCorr(world),
    residual: world.residual,
    heading,
    n: world.graph.nodes.length,
    e: world.graph.edges.length,
    N: world.N,
    K: world.K,
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
