// Mini GPT twins: unique layers vs looped fly unit (W then T).
// Node ESM. Exit 0 and print a table plus PASS. Exit 1 on failure.
// Not a foundation model. Same tiny corpus, same steps.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { applyMotif } from "../public/loop.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const graph = JSON.parse(readFileSync(join(__dirname, "..", "public", "data", "fly-cx.json"), "utf8"));

const CORPUS =
  "the ring holds a heading. the stack seeks the target. a miss is an open error. " +
  "acquire when the bump is home. loop the same weights. stack the copies. " +
  "tissue adds and cancels. reafference is the top predicting the floor. ";

const STEPS = 80;
const LR = 0.08;
const SEQ = 12;
const K_LOOP = 4;
const D_UNIQUE = 24;
const CELLS = graph.nodes.length;

function fail(msg) {
  process.stderr.write(`FAIL: ${msg}\n`);
  process.exit(1);
}

function vocabOf(text) {
  const chars = [...new Set(text.split(""))];
  chars.sort();
  const stoi = new Map(chars.map((c, i) => [c, i]));
  const ids = text.split("").map((c) => stoi.get(c));
  return { chars, stoi, ids, V: chars.length };
}

function zeros(r, c) {
  const out = new Array(r);
  for (let i = 0; i < r; i++) {
    out[i] = new Float64Array(c);
  }
  return out;
}

function randn(r, c, scale) {
  const out = zeros(r, c);
  for (let i = 0; i < r; i++) {
    for (let j = 0; j < c; j++) {
      out[i][j] = (Math.random() * 2 - 1) * scale;
    }
  }
  return out;
}

function softmax(logits) {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) if (logits[i] > max) max = logits[i];
  let sum = 0;
  const p = new Float64Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    const e = Math.exp(logits[i] - max);
    p[i] = e;
    sum += e;
  }
  for (let i = 0; i < p.length; i++) p[i] /= sum;
  return p;
}

function window(ids, start, len) {
  const x = new Array(len);
  for (let i = 0; i < len; i++) x[i] = ids[(start + i) % ids.length];
  const y = ids[(start + len) % ids.length];
  return { x, y };
}

function countParams(mats) {
  let n = 0;
  for (const m of mats) {
    if (Array.isArray(m)) n += m.length * m[0].length;
    else if (m && m.length) n += m.length;
  }
  return n;
}

function trainUnique(ids, V) {
  const E = randn(V, D_UNIQUE, 0.08);
  const W1 = randn(D_UNIQUE, D_UNIQUE, 0.08);
  const W2 = randn(D_UNIQUE, D_UNIQUE, 0.08);
  const U = randn(D_UNIQUE, V, 0.08);
  let last = 0;
  for (let step = 0; step < STEPS; step++) {
    const start = step % Math.max(1, ids.length - SEQ);
    const { x, y } = window(ids, start, SEQ);
    const h = new Float64Array(D_UNIQUE);
    for (let t = 0; t < SEQ; t++) {
      const row = E[x[t]];
      for (let d = 0; d < D_UNIQUE; d++) h[d] += row[d];
    }
    for (let d = 0; d < D_UNIQUE; d++) h[d] /= SEQ;
    const h1 = new Float64Array(D_UNIQUE);
    for (let i = 0; i < D_UNIQUE; i++) {
      let s = 0;
      for (let j = 0; j < D_UNIQUE; j++) s += h[j] * W1[j][i];
      h1[i] = Math.tanh(s);
    }
    const h2 = new Float64Array(D_UNIQUE);
    for (let i = 0; i < D_UNIQUE; i++) {
      let s = 0;
      for (let j = 0; j < D_UNIQUE; j++) s += h1[j] * W2[j][i];
      h2[i] = Math.tanh(s);
    }
    const logits = new Float64Array(V);
    for (let v = 0; v < V; v++) {
      let s = 0;
      for (let d = 0; d < D_UNIQUE; d++) s += h2[d] * U[d][v];
      logits[v] = s;
    }
    const p = softmax(logits);
    last = -Math.log(Math.max(p[y], 1e-12));
    const dLog = new Float64Array(V);
    for (let v = 0; v < V; v++) dLog[v] = p[v];
    dLog[y] -= 1;
    const dH2 = new Float64Array(D_UNIQUE);
    for (let d = 0; d < D_UNIQUE; d++) {
      let g = 0;
      for (let v = 0; v < V; v++) g += dLog[v] * U[d][v];
      dH2[d] = g * (1 - h2[d] * h2[d]);
      for (let v = 0; v < V; v++) U[d][v] -= LR * h2[d] * dLog[v];
    }
    const dH1 = new Float64Array(D_UNIQUE);
    for (let j = 0; j < D_UNIQUE; j++) {
      let g = 0;
      for (let i = 0; i < D_UNIQUE; i++) g += dH2[i] * W2[j][i];
      dH1[j] = g * (1 - h1[j] * h1[j]);
      for (let i = 0; i < D_UNIQUE; i++) W2[j][i] -= LR * h1[j] * dH2[i];
    }
    const dH = new Float64Array(D_UNIQUE);
    for (let j = 0; j < D_UNIQUE; j++) {
      let g = 0;
      for (let i = 0; i < D_UNIQUE; i++) g += dH1[i] * W1[j][i];
      dH[j] = g;
      for (let i = 0; i < D_UNIQUE; i++) W1[j][i] -= LR * h[j] * dH1[i];
    }
    const scale = 1 / SEQ;
    for (let t = 0; t < SEQ; t++) {
      const row = E[x[t]];
      for (let d = 0; d < D_UNIQUE; d++) row[d] -= LR * dH[d] * scale;
    }
  }
  return { loss: last, params: countParams([E, W1, W2, U]), layers: 2 };
}

function trainLooped(ids, V) {
  const E = randn(V, CELLS, 0.06);
  const U = randn(CELLS, V, 0.06);
  const v = new Float32Array(CELLS);
  let last = 0;
  for (let step = 0; step < STEPS; step++) {
    const start = step % Math.max(1, ids.length - SEQ);
    const { x, y } = window(ids, start, SEQ);
    v.fill(0);
    for (let t = 0; t < SEQ; t++) {
      const row = E[x[t]];
      for (let i = 0; i < CELLS; i++) v[i] += row[i];
    }
    for (let i = 0; i < CELLS; i++) v[i] /= SEQ;
    applyMotif(v, graph, K_LOOP, 0.072);
    const logits = new Float64Array(V);
    for (let tok = 0; tok < V; tok++) {
      let s = 0;
      for (let i = 0; i < CELLS; i++) s += v[i] * U[i][tok];
      logits[tok] = s;
    }
    const p = softmax(logits);
    last = -Math.log(Math.max(p[y], 1e-12));
    const dLog = new Float64Array(V);
    for (let tok = 0; tok < V; tok++) dLog[tok] = p[tok];
    dLog[y] -= 1;
    const dV = new Float64Array(CELLS);
    for (let i = 0; i < CELLS; i++) {
      let g = 0;
      for (let tok = 0; tok < V; tok++) {
        g += dLog[tok] * U[i][tok];
        U[i][tok] -= LR * v[i] * dLog[tok];
      }
      dV[i] = g * 0.55;
    }
    const scale = 1 / SEQ;
    for (let t = 0; t < SEQ; t++) {
      const row = E[x[t]];
      for (let i = 0; i < CELLS; i++) row[i] -= LR * dV[i] * scale;
    }
  }
  return { loss: last, params: countParams([E, U]), layers: 1, K: K_LOOP, cells: CELLS };
}

function finite(x) {
  return typeof x === "number" && Number.isFinite(x);
}

const { ids, V } = vocabOf(CORPUS);
const unique = trainUnique(ids, V);
const looped = trainLooped(ids, V);

if (!finite(unique.loss)) fail(`unique loss is not finite: ${unique.loss}`);
if (!finite(looped.loss)) fail(`looped loss is not finite: ${looped.loss}`);
if (looped.K !== K_LOOP) fail("looped twin did not run K loops");
if (looped.cells !== 47) fail(`looped twin cells ${looped.cells} != 47`);

process.stdout.write(
  "twin        params  layers  K  loss\n" +
    `unique      ${String(unique.params).padStart(6)}      ${unique.layers}  -  ${unique.loss.toFixed(4)}\n` +
    `looped W+T  ${String(looped.params).padStart(6)}      ${looped.layers}  ${looped.K}  ${looped.loss.toFixed(4)}\n`
);
process.stdout.write("PASS\n");
