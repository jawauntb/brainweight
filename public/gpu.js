// WebGPU tier: the visitor's own device stacks and loops the motif W.
// W only, no T (pair: false). Neighbor coupling matches modal_mind/app.py
// _run_mass (batch roll, not loop.js couple()/tissue()), because this tier
// is a mass-scale sibling of the L4 run, not the CPU window.
// No GPU before a gesture, same rule as think.js. Any missing navigator.gpu,
// adapter, or device leaves this tier off and reports { ok: false }.

import { load } from "./loop.js";
import { wetGrams, MOTIF_FULL } from "./mass.js";

const SAMPLE = 64;
const COUPLE = 0.12;
const TISSUE = 0.05;
const DECAY = 0.80;
const MEAN_PULL = 0.40;
const GAIN = 0.072;
const CAP_N = 2_000_000;
const FLOOR_N = 1024;
const DEFAULT_N = 262144;

const SHADER = `
struct Params {
  n: u32,
  edgeCount: u32,
  unitCount: u32,
  gain: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> edgeSrc: array<u32>;
@group(0) @binding(2) var<storage, read> edgeDst: array<u32>;
@group(0) @binding(3) var<storage, read> edgeW: array<f32>;
@group(0) @binding(4) var<storage, read> vIn: array<f32>;
@group(0) @binding(5) var<storage, read_write> vOut: array<f32>;

const NN: u32 = 47u;
const EE: u32 = 280u;
const COUPLE: f32 = 0.12;
const TISSUE: f32 = 0.05;
const DECAY: f32 = 0.80;
const MEAN_PULL: f32 = 0.40;

fn wrapIdx(i: i32, n: u32) -> u32 {
  let m = i32(n);
  var r = i % m;
  if (r < 0) { r = r + m; }
  return u32(r);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let u = gid.x;
  if (u >= params.unitCount) { return; }
  let N = params.unitCount;
  let base = u * NN;
  let um1 = wrapIdx(i32(u) - 1, N) * NN;
  let um2 = wrapIdx(i32(u) - 2, N) * NN;
  let up1 = wrapIdx(i32(u) + 1, N) * NN;

  // Same shape as _run_mass: v += 0.12*roll(v,1); nbr = 0.5*(roll(v,1)+roll(v,-1))
  // read off the post-roll v; v += TISSUE*(nbr-v). Neighbor "new" values are
  // recomputed here from vIn rather than read from another thread's output,
  // since every thread only ever reads the same vIn snapshot.
  var v: array<f32, 47>;
  for (var i: u32 = 0u; i < NN; i = i + 1u) {
    let oldU = vIn[base + i];
    let oldUm1 = vIn[um1 + i];
    let oldUm2 = vIn[um2 + i];
    let oldUp1 = vIn[up1 + i];
    let newU = oldU + COUPLE * oldUm1;
    let newUm1 = oldUm1 + COUPLE * oldUm2;
    let newUp1 = oldUp1 + COUPLE * oldU;
    let nbr = 0.5 * (newUm1 + newUp1);
    v[i] = newU + TISSUE * (nbr - newU);
  }

  var inc: array<f32, 47>;
  for (var i: u32 = 0u; i < NN; i = i + 1u) { inc[i] = 0.0; }
  for (var e: u32 = 0u; e < EE; e = e + 1u) {
    let s = edgeSrc[e];
    let t = edgeDst[e];
    inc[t] = inc[t] + tanh(v[s]) * edgeW[e] * params.gain;
  }

  var meanAcc: f32 = 0.0;
  for (var i: u32 = 0u; i < NN; i = i + 1u) {
    let val = v[i] * DECAY + inc[i];
    v[i] = val;
    meanAcc = meanAcc + val;
  }
  let meanV = meanAcc / f32(NN);
  for (var i: u32 = 0u; i < NN; i = i + 1u) {
    var val = v[i] - meanV * MEAN_PULL;
    val = clamp(val, -1.0, 1.0);
    vOut[base + i] = val;
  }
}
`;

let ctxPromise = null;
let disabled = false;

export async function initGpu() {
  if (disabled) return null;
  if (ctxPromise) return ctxPromise;
  ctxPromise = build().catch(() => {
    disabled = true;
    return null;
  });
  return ctxPromise;
}

async function build() {
  if (typeof navigator === "undefined" || !navigator.gpu) return null;
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return null;
  const device = await adapter.requestDevice();
  const graph = await load();
  if (!graph) return null;

  const n = graph.nodes.length;
  const edges = graph.edges;
  const edgeSrc = new Uint32Array(edges.length);
  const edgeDst = new Uint32Array(edges.length);
  const edgeW = new Float32Array(edges.length);
  for (let i = 0; i < edges.length; i++) {
    edgeSrc[i] = edges[i].s;
    edgeDst[i] = edges[i].t;
    edgeW[i] = edges[i].w * edges[i].sign;
  }

  const maxBind = device.limits.maxStorageBufferBindingSize || 128 * 1024 * 1024;
  const cap = Math.min(CAP_N, Math.floor(maxBind / (n * 4)));
  if (cap < FLOOR_N) return null;
  const N = Math.min(cap, DEFAULT_N);

  const module = device.createShaderModule({ code: SHADER });
  const pipeline = device.createComputePipeline({ layout: "auto", compute: { module, entryPoint: "main" } });

  const edgeBufs = {
    src: makeBuffer(device, edgeSrc, GPUBufferUsage.STORAGE),
    dst: makeBuffer(device, edgeDst, GPUBufferUsage.STORAGE),
    w: makeBuffer(device, edgeW, GPUBufferUsage.STORAGE),
  };

  const paramsData = new ArrayBuffer(16);
  new Uint32Array(paramsData, 0, 3).set([n, edges.length, N]);
  new Float32Array(paramsData, 12, 1)[0] = GAIN;
  const paramsBuf = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(paramsBuf, 0, paramsData);

  const epg = [];
  for (let i = 0; i < n; i++) if (graph.nodes[i].type === "EPG") epg.push(i);

  const initial = seedInitial(graph, epg.length ? epg : [0], N, n);
  const vA = makeBuffer(device, initial, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
  const vB = device.createBuffer({
    size: initial.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });

  return { device, pipeline, graph, epg, n, edgeCount: edges.length, edgeBufs, paramsBuf, N, vA, vB };
}

function makeBuffer(device, typed, usage) {
  const buf = device.createBuffer({
    size: typed.byteLength,
    usage: usage | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buf, 0, typed);
  return buf;
}

function seedInitial(graph, epg, N, n) {
  const nodes = graph.nodes;
  const BUMP_AMP = 0.42;
  const BUMP_WIDTH = 3.2;
  const v = new Float32Array(N * n);
  for (let u = 0; u < N; u++) {
    const bumpNode = epg[(u * 7 + 3) % epg.length];
    const bx = nodes[bumpNode].x;
    const by = nodes[bumpNode].y;
    const off = u * n;
    for (let i = 0; i < n; i++) {
      const dx = nodes[i].x - bx;
      const dy = nodes[i].y - by;
      v[off + i] = BUMP_AMP * Math.exp(-BUMP_WIDTH * (dx * dx + dy * dy));
    }
  }
  return v;
}

async function stepAndRead(ctx, K) {
  const { device, pipeline, edgeBufs, paramsBuf, N, n } = ctx;
  const workgroups = Math.ceil(N / 64);
  const encoder = device.createCommandEncoder();

  const predStage = device.createBuffer({
    size: n * 4,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  encoder.copyBufferToBuffer(ctx.vA, (N - 1) * n * 4, predStage, 0, n * 4);

  let src = ctx.vA;
  let dst = ctx.vB;
  for (let k = 0; k < K; k++) {
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: paramsBuf } },
        { binding: 1, resource: { buffer: edgeBufs.src } },
        { binding: 2, resource: { buffer: edgeBufs.dst } },
        { binding: 3, resource: { buffer: edgeBufs.w } },
        { binding: 4, resource: { buffer: src } },
        { binding: 5, resource: { buffer: dst } },
      ],
    });
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(workgroups);
    pass.end();
    const tmp = src;
    src = dst;
    dst = tmp;
  }

  const sampleCount = Math.min(SAMPLE, N);
  const sampleStage = device.createBuffer({
    size: sampleCount * n * 4,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  encoder.copyBufferToBuffer(src, 0, sampleStage, 0, sampleCount * n * 4);

  device.queue.submit([encoder.finish()]);

  await predStage.mapAsync(GPUMapMode.READ);
  const pred = new Float32Array(predStage.getMappedRange().slice(0));
  predStage.unmap();
  predStage.destroy();

  await sampleStage.mapAsync(GPUMapMode.READ);
  const sample = new Float32Array(sampleStage.getMappedRange().slice(0));
  sampleStage.unmap();
  sampleStage.destroy();

  ctx.vA = src;
  ctx.vB = dst;
  return { pred, sample, sampleCount };
}

export function pearson(a, b) {
  const n = a.length;
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

export function diagnostics(ctx, pred, sample, sampleCount, K, target) {
  const n = ctx.n;
  const epg = ctx.epg;
  const after0 = sample.subarray(0, n);

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = pred[i] - after0[i];
    sum += d * d;
  }
  const residual = Math.sqrt(sum / n);

  let sx = 0;
  let sy = 0;
  const nodes = ctx.graph.nodes;
  for (let k = 0; k < epg.length; k++) {
    const idx = epg[k];
    sx += after0[idx] * nodes[idx].x;
    sy += after0[idx] * nodes[idx].y;
  }
  const heading = Math.atan2(sy, sx);
  let order = epg.length ? Math.hypot(sx, sy) / epg.length : 0;
  if (order > 1) order = 1;

  let corrSum = 0;
  let pairs = 0;
  for (let a = 0; a < sampleCount; a++) {
    const b = (a + 1) % sampleCount;
    if (a === b) continue;
    const va = sample.subarray(a * n, (a + 1) * n);
    const vb = sample.subarray(b * n, (b + 1) * n);
    corrSum += pearson(va, vb);
    pairs++;
  }
  const corr = pairs ? corrSum / pairs : 1;

  const t = Number.isFinite(target) ? target : 0;
  let err = t - heading;
  while (err > Math.PI) err -= Math.PI * 2;
  while (err < -Math.PI) err += Math.PI * 2;
  const score = (1 + Math.cos(err)) / 2;

  let regime = "idle";
  if (corr < 0.38) regime = "fission";
  else if (order > 0.30 && residual < 0.09) regime = "reaffer";
  else if (order > 0.30) regime = "heading";
  else if (corr > 0.75) regime = "agree";

  return {
    ok: true,
    gpu: true,
    device: "webgpu",
    mode: "mass",
    pair: false,
    live: true,
    N: ctx.N,
    K,
    n,
    e: ctx.edgeCount,
    residual,
    corr,
    order,
    heading,
    target: t,
    error: err,
    score,
    regime,
    mass_g: wetGrams(ctx.N),
    motif_frac: ctx.N / MOTIF_FULL,
  };
}

const clock = {
  armed: false,
  inflight: false,
  lastAt: -Infinity,
  last: { ok: false, reason: "idle" },
};

const CADENCE_MS = 2000;

export function armWebgpu() {
  clock.armed = true;
}

export function webgpuStats() {
  return clock.last;
}

export async function requestWebgpuMass(K, target) {
  if (!clock.armed) {
    clock.last = { ok: false, reason: "gesture" };
    return null;
  }
  const now = performance.now();
  if (clock.inflight) return null;
  if (now - clock.lastAt < CADENCE_MS) return null;
  clock.inflight = true;
  clock.lastAt = now;
  try {
    const ctx = await initGpu();
    if (!ctx) {
      clock.last = { ok: false, reason: "unsupported" };
      return null;
    }
    const t0 = performance.now();
    const { pred, sample, sampleCount } = await stepAndRead(ctx, K);
    const out = diagnostics(ctx, pred, sample, sampleCount, K, target);
    out.ms = performance.now() - t0;
    clock.last = out;
    return out;
  } catch {
    disabled = true;
    clock.last = { ok: false, reason: "error" };
    return null;
  } finally {
    clock.inflight = false;
  }
}
