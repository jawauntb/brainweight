// Assay: the WebGPU tier degrades to { ok: false } everywhere it cannot run
// (no navigator.gpu under Node, same as an unsupported browser), the pure-JS
// diagnostics math stays sane, and the wiring into main.js/index.html exists.
// Exit 0 and print PASS. Exit 1 on any failure.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  pearson,
  diagnostics,
  armWebgpu,
  webgpuStats,
  requestWebgpuMass,
  initGpu,
} from "./public/gpu.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function fail(msg) {
  process.stderr.write(`FAIL: ${msg}\n`);
  process.exit(1);
}

// No navigator.gpu in Node: this is exactly the "unsupported browser" path,
// and it must resolve cleanly rather than throw.
const ctx = await initGpu();
if (ctx !== null) fail("initGpu() should be null without navigator.gpu");

const before = await requestWebgpuMass(4, 0);
if (before !== null) fail("requestWebgpuMass() before a gesture should return null");
if (webgpuStats().reason !== "gesture") fail("webgpuStats() should report reason gesture pre-arm");

armWebgpu();
const after = await requestWebgpuMass(4, 0);
if (after !== null) fail("requestWebgpuMass() without a GPU should return null");
if (webgpuStats().ok) fail("webgpuStats() should not report ok without a GPU");
if (webgpuStats().reason !== "unsupported") fail(`webgpuStats() reason is ${webgpuStats().reason}, not unsupported`);

if (pearson([1, 2, 3], [1, 2, 3]) < 0.999) fail("pearson of identical vectors is not ~1");
if (pearson([1, 2, 3], [3, 2, 1]) > -0.999) fail("pearson of a mirrored vector is not ~-1");
if (pearson([1, 1, 1], [1, 1, 1]) !== 1) fail("pearson of a flat vector should fall back to 1");

// Synthetic 4-node ring, 2 EPG nodes at opposite headings.
const fakeGraph = {
  nodes: [
    { type: "EPG", x: 1, y: 0 },
    { type: "PEG", x: 0, y: 1 },
    { type: "EPG", x: -1, y: 0 },
    { type: "PEG", x: 0, y: -1 },
  ],
};
const fakeCtx = { n: 4, epg: [0, 2], graph: fakeGraph, N: 8, edgeCount: 4 };
const pred = new Float32Array([0.5, 0, 0, 0]);
const sample = new Float32Array(64 * 4);
for (let u = 0; u < 64; u++) {
  sample[u * 4 + 0] = 0.6;
  sample[u * 4 + 2] = -0.1;
}
const diag = diagnostics(fakeCtx, pred, sample, 64, 4, 0);
if (!diag.ok || diag.device !== "webgpu" || diag.pair !== false) fail("diagnostics() shape is wrong");
if (!Number.isFinite(diag.residual) || !Number.isFinite(diag.order) || !Number.isFinite(diag.corr)) {
  fail("diagnostics() produced a non-finite metric");
}
if (diag.order < 0 || diag.order > 1) fail(`diagnostics() order ${diag.order} is out of range`);
if (diag.corr < -1 || diag.corr > 1) fail(`diagnostics() corr ${diag.corr} is out of range`);
if (Math.abs(diag.corr - 1) > 1e-6) fail("identical sample rows should correlate at 1");

const gpu = readFileSync(join(__dirname, "public", "gpu.js"), "utf8");
if (!gpu.includes("navigator.gpu")) fail("gpu.js does not feature-detect navigator.gpu");
if (!gpu.includes("requestAdapter")) fail("gpu.js does not request an adapter");
if (!gpu.includes("@compute @workgroup_size")) fail("gpu.js is missing a compute entry point");
if (!gpu.includes("pair: false")) fail("gpu.js does not label the tier W-only");
if (gpu.includes("console.log")) fail("gpu.js has a console.log");

const main = readFileSync(join(__dirname, "public", "main.js"), "utf8");
if (!main.includes("armWebgpu") || !main.includes("requestWebgpuMass") || !main.includes("webgpuStats")) {
  fail("main.js does not wire up the WebGPU tier");
}

const html = readFileSync(join(__dirname, "public", "index.html"), "utf8");
if (!html.includes('id="t-webgpu"')) fail("index.html missing webgpu telemetry");

process.stdout.write(
  `webgpu: fallback=${webgpuStats().reason} order=${diag.order.toFixed(2)} corr=${diag.corr.toFixed(2)} residual=${diag.residual.toFixed(2)}\n`
);
process.stdout.write("PASS\n");
