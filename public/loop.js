// Looped / stacked units. One unit is the fly motif W plus a tiny shared transformer T.
// N units, coupled. Each tick applies the unit, K times. Same W and same T every loop.
// Graph from /data/fly-cx.json (Janelia male-cns:v1.0, CC-BY). Visual N is a window.

import { HUMAN_G, TARGET_COPIES, MOTIF_FULL, wetGrams, massFraction, motifFraction, splitGrams } from "./mass.js";

const COUPLE = 0.12;
const TISSUE = 0.05;
const DECAY = 0.80;
const GAIN = 0.072;
const MEAN_PULL = 0.40;
const BUMP_AMP = 0.42;
const BUMP_WIDTH = 3.2;
const NOISE = 0.01;
const FLY_GLIA = 0.082;
const GLIA_ALPHA = 1.15;
const SEEK_TURN = 0.42;
const HOLD_AMP = 0.55;
const TD = 8;
const T_FF = 16;
const T_MIX = 0.18;

export const CIRCUIT_JOB = {
  epg: "EPG holds the heading. A bump on a ring, not a mind.",
  pen: "PEN shifts the bump. That is how the compass turns.",
  peg: "PEG feeds the heading back. The ring hears its own ask.",
  delta7: "Delta7 inhibits and sharpens. The bump stays a bump.",
  el: "EL is the extra ring. Same motif, another loop.",
};

export function familyOf(type) {
  return typeFamily(type || "");
}

let Tw = null;

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
    types: buildTypeIndex(graph),
    seeds: [],
    vs: [],
    residual: 0,
    prevResidual: 0,
    second: 0,
    wave: 0,
    isolate: 0,
    intf: 0,
    lastHeading: 0,
    drive: 0,
    target: 0,
    error: 0,
    score: 0,
    quiet: 0,
    gesture: null,
    gestureFrames: 0,
    flash: 0,
    glia: true,
    gliaFrac: FLY_GLIA,
    g: null,
    gMean: 0,
    gainEff: GAIN,
    pair: true,
    _pred: null,
    _inc: null,
    _scratch: null,
    _tbuf: null,
  };
  setN(world, N);
  return world;
}

export function setN(world, N) {
  const next = clampInt(N, 1, 8);
  const n = world.graph.nodes.length;
  world.N = next;
  if (!world.types) world.types = buildTypeIndex(world.graph);
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
  world._tbuf = {
    q: new Float32Array(n * TD),
    k: new Float32Array(n * TD),
    vp: new Float32Array(n * TD),
    score: new Float32Array(n),
  };
  world._attn = new Float32Array(n * n);
  world.mix = 0;
  world.residual = 0;
  const { heading } = epgOrder(world);
  world.drive = heading;
  world.target = heading;
  world.g = new Float32Array(next);
}

export function setK(world, K) {
  world.K = clampInt(K, 1, 16);
}

export function markGesture(world, name, frames = 90) {
  world.gesture = name;
  world.gestureFrames = frames;
  world.quiet = 0;
  world.flash = 1;
}

export function injectHeading(world, heading, amount = 0.55, mark = true) {
  if (!world || !world.vs || !world.vs.length) return heading;
  const list = world.graph.nodes;
  const n = list.length;
  const bx = Math.cos(heading);
  const by = Math.sin(heading);
  const keep = mark ? 0.10 : 0.08;
  for (let s = 0; s < world.N; s++) {
    const v = world.vs[s];
    for (let i = 0; i < n; i++) {
      const nd = list[i];
      const dx = nd.x - bx;
      const dy = nd.y - by;
      const g = Math.exp(-(dx * dx + dy * dy) * BUMP_WIDTH);
      let next = v[i] * keep + amount * g;
      if (next > 1) next = 1;
      if (next < -1) next = -1;
      v[i] = next;
    }
  }
  if (mark) {
    world.drive = heading;
    world.target = heading;
    markGesture(world, "steer");
  }
  return heading;
}

export function kick(world) {
  if (!world) return;
  const graph = world.graph;
  const epg = world.epg;
  for (let i = 0; i < world.N; i++) {
    world.seeds[i] = (world.seeds[i] + 0.41 + i * 0.17) % 1;
    world.vs[i] = bindStack(graph, epg, world.seeds[i]);
  }
  world.drive = (world.drive || 0) + Math.PI * 0.5;
  if (world.drive > Math.PI) world.drive -= Math.PI * 2;
  markGesture(world, "kick", 120);
}

export function wander(world) {
  if (!world || !world.vs || !world.vs.length) return;
  if (world.gesture === "target" && (world.gestureFrames || 0) > 0) {
    world.quiet = 0;
    return;
  }
  if (world.gesture === "steer" && (world.gestureFrames || 0) > 0) {
    world.quiet = 0;
    return;
  }
  if (world.gesture === "kick" && (world.gestureFrames || 0) > 48) return;
  world.quiet = (world.quiet || 0) + 1;
  if (world.quiet < 28) return;
  world.target = wrapPi((world.target || 0) + 0.055);
}

export function setTarget(world, heading) {
  if (!world) return heading;
  world.target = wrapPi(heading);
  markGesture(world, "target", 100);
  return world.target;
}

export function applyMotif(v, graph, K, gain) {
  const inc = new Float32Array(v.length);
  const loops = clampInt(K, 1, 16);
  const g = Number.isFinite(gain) ? gain : GAIN;
  const buf = {
    q: new Float32Array(v.length * TD),
    k: new Float32Array(v.length * TD),
    vp: new Float32Array(v.length * TD),
    score: new Float32Array(v.length),
  };
  for (let k = 0; k < loops; k++) {
    applyW(v, graph.edges, inc, g);
    applyT(v, graph.nodes, buf);
  }
  return v;
}

export function applyT(v, nodes, buf, attn) {
  const n = v.length;
  const w = tWeights();
  const d = w.d;
  const q = buf.q;
  const k = buf.k;
  const vp = buf.vp;
  const score = buf.score;
  const inv = 1 / Math.sqrt(d);
  if (attn && attn.length === n * n) {
    for (let a = 0; a < attn.length; a++) attn[a] = 0;
  }
  for (let i = 0; i < n; i++) {
    const a = v[i];
    const px = nodes[i].x;
    const py = nodes[i].y;
    const off = i * d;
    for (let t = 0; t < d; t++) {
      q[off + t] = a * w.Wq[t] + px * w.Px[t] + py * w.Py[t];
      k[off + t] = a * w.Wk[t] + px * w.Px[t] + py * w.Py[t];
      vp[off + t] = a * w.Wv[t];
    }
  }
  for (let i = 0; i < n; i++) {
    const io = i * d;
    let maxs = -1e9;
    for (let j = 0; j < n; j++) {
      let dot = 0;
      const jo = j * d;
      for (let t = 0; t < d; t++) dot += q[io + t] * k[jo + t];
      const s = dot * inv;
      score[j] = s;
      if (s > maxs) maxs = s;
    }
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const e = Math.exp(score[j] - maxs);
      score[j] = e;
      sum += e;
    }
    const invs = sum > 1e-12 ? 1 / sum : 0;
    if (attn && attn.length === n * n) {
      const row = i * n;
      for (let j = 0; j < n; j++) attn[row + j] = score[j] * invs;
    }
    const hid = w.hid;
    for (let u = 0; u < T_FF; u++) hid[u] = 0;
    for (let t = 0; t < d; t++) {
      let o = 0;
      for (let j = 0; j < n; j++) o += score[j] * invs * vp[j * d + t];
      for (let u = 0; u < T_FF; u++) hid[u] += o * w.W1[t * T_FF + u];
    }
    let y = 0;
    for (let u = 0; u < T_FF; u++) {
      const h = hid[u] < 0 ? 0 : hid[u];
      y += h * w.W2[u];
    }
    let next = v[i] * (1 - T_MIX) + T_MIX * tanh(y);
    if (next > 1) next = 1;
    if (next < -1) next = -1;
    v[i] = next;
  }
}

export function step(world) {
  const { vs, N, K, graph, _pred, _inc } = world;
  const n = vs[0].length;
  updateGlia(world);
  const kicking = world.gesture === "kick" && (world.gestureFrames || 0) > 40;
  if (!kicking) seek(world);
  _pred.set(vs[N - 1]);
  if (!world.passes || world.passes.length !== K) world.passes = new Array(K);

  for (let k = 0; k < K; k++) {
    if (N > 1) {
      couple(world);
      tissue(world);
    }
    for (let i = 0; i < N; i++) {
      applyW(vs[i], graph.edges, _inc, world.gainEff);
      if (world.pair !== false) {
        applyT(vs[i], graph.nodes, world._tbuf, (i === 0 && k === K - 1) ? world._attn : null);
      }
    }
    let sum = 0;
    const after = vs[0];
    for (let i = 0; i < n; i++) {
      const d = _pred[i] - after[i];
      sum += d * d;
    }
    const residual = Math.sqrt(sum / n);
    world.passes[k] = Number.isFinite(residual) ? residual : 0;
  }

  const safeRes = world.passes[K - 1] || 0;
  const prev = world.residual || 0;
  world.second = Math.abs(safeRes - prev);
  world.prevResidual = prev;
  world.residual = safeRes;
  world.depth = K < 2 ? 0 : Math.abs((world.passes[K - 1] || 0) - (world.passes[0] || 0));
  world.mix = world.pair !== false ? attentionMix(world._attn, graph.edges, n) : 0;
  readWorld(world);
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
  const te = typeEnergy(world);
  if ((world.gestureFrames || 0) > 0) world.gestureFrames -= 1;
  else world.gesture = null;
  return {
    order,
    corr,
    residual: world.residual,
    passes: world.passes ? world.passes.slice() : [],
    depth: world.depth || 0,
    mix: world.mix || 0,
    second: world.second || 0,
    wave: world.wave || 0,
    isolate,
    intf,
    heading,
    regime: classify(world, order, corr, isolate, intf),
    epg: te.epg,
    pen: te.pen,
    peg: te.peg,
    delta7: te.delta7,
    el: te.el,
    circuit: hottestCircuit(te),
    pair: world.pair !== false,
    gesture: world.gesture || null,
    target: world.target || 0,
    error: world.error || 0,
    score: world.score || 0,
    gain: world.gainEff || GAIN,
    g: world.gMean || 0,
    n: world.graph.nodes.length,
    e: world.graph.edges.length,
    N: world.N,
    K: world.K,
    mass_g: wetGrams(world.N),
    neuron_g: split.neuron_g,
    tissue_g: split.tissue_g,
    human_g: HUMAN_G,
    target_copies: TARGET_COPIES,
    motif_full: MOTIF_FULL,
    fraction: massFraction(world.N),
    motif_frac: motifFraction(world.N),
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

export function graphEdges(world) {
  return world.graph && world.graph.edges ? world.graph.edges : [];
}

export function attnMatrix(world) {
  return world._attn || null;
}

export function typeEnergy(world) {
  const v = world.vs[0];
  const types = world.types;
  return {
    epg: meanAbsAt(v, types.epg),
    pen: meanAbsAt(v, types.pen),
    peg: meanAbsAt(v, types.peg),
    delta7: meanAbsAt(v, types.delta7),
    el: meanAbsAt(v, types.el),
  };
}

function typeFamily(type) {
  if (type === "EPG" || type === "EPGt") return "epg";
  if (type.indexOf("PEN") === 0) return "pen";
  if (type === "PEG") return "peg";
  if (type === "Delta7") return "delta7";
  if (type === "EL") return "el";
  return null;
}

function buildTypeIndex(graph) {
  const types = { epg: [], pen: [], peg: [], delta7: [], el: [] };
  const list = graph && graph.nodes;
  if (!list) return types;
  for (let i = 0; i < list.length; i++) {
    const fam = typeFamily(list[i].type || "");
    if (fam) types[fam].push(list[i].i);
  }
  return types;
}

function meanAbsAt(v, indices) {
  const n = indices.length;
  if (!n) return 0;
  let sum = 0;
  for (let k = 0; k < n; k++) sum += Math.abs(v[indices[k]]);
  const mean = sum / n;
  return Number.isFinite(mean) ? mean : 0;
}

function tWeights() {
  if (Tw) return Tw;
  const Wq = new Float32Array(TD);
  const Wk = new Float32Array(TD);
  const Wv = new Float32Array(TD);
  const Px = new Float32Array(TD);
  const Py = new Float32Array(TD);
  const W1 = new Float32Array(TD * T_FF);
  const W2 = new Float32Array(T_FF);
  const hid = new Float32Array(T_FF);
  for (let t = 0; t < TD; t++) {
    Wq[t] = hash11(1, t) * 0.35;
    Wk[t] = hash11(2, t) * 0.35;
    Wv[t] = hash11(3, t) * 0.35;
    Px[t] = hash11(4, t) * 0.12;
    Py[t] = hash11(5, t) * 0.12;
    for (let u = 0; u < T_FF; u++) W1[t * T_FF + u] = hash11(6 + t, u) * 0.22;
  }
  for (let u = 0; u < T_FF; u++) W2[u] = hash11(40, u) * 0.22;
  Tw = { Wq, Wk, Wv, Px, Py, W1, W2, hid, d: TD };
  return Tw;
}

function hash11(a, b) {
  let x = Math.imul(a + 1, 374761393) + Math.imul(b + 1, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x >>> 0) / 4294967296) * 2 - 1;
}

function hottestCircuit(te) {
  let best = "epg";
  let bestV = te.epg;
  if (te.pen > bestV) { best = "pen"; bestV = te.pen; }
  if (te.peg > bestV) { best = "peg"; bestV = te.peg; }
  if (te.delta7 > bestV) { best = "delta7"; bestV = te.delta7; }
  if (te.el > bestV) { best = "el"; bestV = te.el; }
  return best;
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

export function applyW(v, edges, inc, gain) {
  const n = v.length;
  const g = Number.isFinite(gain) ? gain : GAIN;
  for (let i = 0; i < n; i++) inc[i] = 0;
  for (let e = 0; e < edges.length; e++) {
    const ed = edges[e];
    inc[ed.t] += tanh(v[ed.s]) * ed.w * ed.sign * g;
  }
  let mean = 0;
  for (let i = 0; i < n; i++) {
    v[i] = v[i] * DECAY + inc[i];
    mean += v[i];
  }
  mean /= n;
  for (let i = 0; i < n; i++) v[i] = clamp1(v[i] - mean * MEAN_PULL);
}

function attentionMix(attn, edges, n) {
  if (!attn || !edges || !n) return 0;
  let on = 0;
  for (let e = 0; e < edges.length; e++) {
    const ed = edges[e];
    on += attn[ed.t * n + ed.s] || 0;
  }
  const mix = 1 - on / n;
  if (!Number.isFinite(mix)) return 0;
  return mix < 0 ? 0 : mix > 1 ? 1 : mix;
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

function wrapPi(a) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function readWorld(world) {
  const { heading } = epgOrder(world);
  if (!Number.isFinite(world.target)) world.target = heading;
  const err = wrapPi(world.target - heading);
  world.error = err;
  const score = (1 + Math.cos(err)) / 2;
  world.score = Number.isFinite(score) ? score : 0;
  return heading;
}

function seek(world) {
  const heading = readWorld(world);
  const err = world.error;
  let dest;
  if (Math.abs(err) > 0.85) {
    dest = world.target;
  } else {
    let turn = err;
    if (turn > SEEK_TURN) turn = SEEK_TURN;
    if (turn < -SEEK_TURN) turn = -SEEK_TURN;
    dest = wrapPi(heading + turn);
  }
  world.drive = dest;
  injectHeading(world, dest, Math.abs(err) > 0.85 ? 0.70 : HOLD_AMP, false);
}

function updateGlia(world) {
  if (!world.glia) {
    world.gainEff = GAIN;
    world.gMean = 0;
    return;
  }
  const N = world.N;
  const vs = world.vs;
  if (!vs || !vs.length) {
    world.gainEff = GAIN;
    return;
  }
  if (!world.g || world.g.length !== N) world.g = new Float32Array(N);
  const n = vs[0].length;
  const frac = Number.isFinite(world.gliaFrac) ? world.gliaFrac : FLY_GLIA;
  let sumG = 0;
  for (let i = 0; i < N; i++) {
    const v = vs[i];
    let meanAbs = 0;
    for (let j = 0; j < n; j++) meanAbs += Math.abs(v[j]);
    meanAbs /= n;
    let gi = world.g[i] + 0.16 * (meanAbs - 0.16);
    if (N > 1) {
      const prev = world.g[(i - 1 + N) % N];
      const next = world.g[(i + 1) % N];
      gi += 0.12 * (0.5 * (prev + next) - world.g[i]);
    }
    if (gi < 0) gi = 0;
    if (gi > 1) gi = 1;
    world.g[i] = gi;
    sumG += gi;
  }
  world.gMean = sumG / N;
  world.gainEff = GAIN * (1 + GLIA_ALPHA * frac * world.gMean);
  if (!Number.isFinite(world.gainEff)) world.gainEff = GAIN;
}

function classify(world, order, corr, isolate, intf) {
  const N = world.N;
  const K = world.K;
  if (N === 1 && K === 1) return "both";
  if (N === 1) return "noN";
  if (K === 1) return "noK";
  if ((world.score || 0) > 0.88) return "acquire";
  if ((world.score || 0) < 0.22 && order > 0.16) return "miss";
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
