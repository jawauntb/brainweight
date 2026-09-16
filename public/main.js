import { load, create, setN, setK, step, metrics, stacks, nodes, epgIndex } from "./loop.js";
import { line } from "./verse.js";

const NACRE_SIZE = 96;
const PEARL = "246, 214, 122";

const nacreTiles = new Map();
const nacrePatterns = new Map();
const geomBuf = [];
const headingScratch = { heading: 0, order: 0 };
const ptA = { x: 0, y: 0 };
const ptB = { x: 0, y: 0 };
let epgMask = new Uint8Array(0);

const stage = document.getElementById("stage");
const ctx = stage.getContext("2d");
const verseEl = document.getElementById("verse");
const sliderK = document.getElementById("slider-k");
const sliderN = document.getElementById("slider-n");
const outK = document.getElementById("out-k");
const outN = document.getElementById("out-n");
const btnPause = document.getElementById("btn-pause");
const btnPanels = document.getElementById("btn-panels");
const chromeEls = document.querySelectorAll(".chrome");
const tK = document.getElementById("t-k");
const tN = document.getElementById("t-n");
const tR = document.getElementById("t-r");
const tCorr = document.getElementById("t-corr");
const tRes = document.getElementById("t-res");

let world = null;
let paused = false;
let panelsOn = true;
let vw = 0;
let vh = 0;

function bakeNacre(rgb) {
  const hit = nacreTiles.get(rgb);
  if (hit) return hit;
  const S = NACRE_SIZE;
  const tile = document.createElement("canvas");
  tile.width = S;
  tile.height = S;
  const g = tile.getContext("2d");
  const parts = rgb.split(",");
  const r = +parts[0];
  const gv = +parts[1];
  const b = +parts[2];
  g.fillStyle = `rgb(${r}, ${gv}, ${b})`;
  g.fillRect(0, 0, S, S);
  const glow = g.createRadialGradient(S * 0.28, S * 0.24, 1, S * 0.50, S * 0.52, S * 0.70);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.30)");
  glow.addColorStop(0.34, `rgba(${Math.min(255, r + 36)}, ${Math.min(255, gv + 28)}, ${Math.min(255, b + 22)}, 0.16)`);
  glow.addColorStop(0.70, "rgba(186, 228, 255, 0.10)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = "lighter";
  const band = g.createLinearGradient(0, S * 0.16, S, S * 0.84);
  band.addColorStop(0, "rgba(140, 210, 255, 0)");
  band.addColorStop(0.40, "rgba(190, 255, 230, 0.13)");
  band.addColorStop(0.62, "rgba(255, 190, 220, 0.11)");
  band.addColorStop(1, "rgba(255, 255, 255, 0)");
  g.fillStyle = band;
  g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = "source-over";
  nacreTiles.set(rgb, tile);
  return tile;
}

function nacreFill(rgb) {
  let pat = nacrePatterns.get(rgb);
  if (!pat) {
    pat = ctx.createPattern(bakeNacre(rgb), "repeat");
    nacrePatterns.set(rgb, pat);
  }
  return pat;
}

function fillNacreDot(x, y, r, rgb, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x - NACRE_SIZE * 0.5, y - NACRE_SIZE * 0.5);
  ctx.beginPath();
  ctx.arc(NACRE_SIZE * 0.5, NACRE_SIZE * 0.5, r, 0, Math.PI * 2);
  ctx.fillStyle = nacreFill(rgb);
  ctx.fill();
  ctx.restore();
}

bakeNacre(PEARL);

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  vw = window.innerWidth;
  vh = window.innerHeight;
  stage.width = Math.round(vw * dpr);
  stage.height = Math.round(vh * dpr);
  stage.style.width = `${vw}px`;
  stage.style.height = `${vh}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function clampInt(v, lo, hi) {
  const n = v | 0;
  return n < lo ? lo : n > hi ? hi : n;
}

function fmt(v, digits) {
  if (!Number.isFinite(v)) return "0.00";
  return v.toFixed(digits);
}

function setPaused(next) {
  paused = next;
  btnPause.classList.toggle("is-paused", paused);
  btnPause.setAttribute("aria-pressed", paused ? "true" : "false");
  btnPause.setAttribute("aria-label", paused ? "Resume" : "Pause");
}

function setPanels(next) {
  panelsOn = next;
  document.body.classList.toggle("panels-off", !panelsOn);
  for (let i = 0; i < chromeEls.length; i++) chromeEls[i].hidden = !panelsOn;
  btnPanels.classList.toggle("is-on", !panelsOn);
  btnPanels.setAttribute("aria-pressed", panelsOn ? "false" : "true");
  btnPanels.setAttribute("aria-label", panelsOn ? "Hide chrome" : "Show chrome");
}

function writeTelemetry(m) {
  tK.textContent = String(m.K);
  tN.textContent = String(m.N);
  tR.textContent = fmt(m.order, 2);
  tCorr.textContent = fmt(m.corr, 2);
  tRes.textContent = fmt(m.residual, 3);
}

function applyK(raw) {
  const k = clampInt(raw, 1, 16);
  sliderK.value = String(k);
  outK.textContent = String(k);
  if (world) setK(world, k);
}

function applyN(raw) {
  const n = clampInt(raw, 1, 8);
  sliderN.value = String(n);
  outN.textContent = String(n);
  if (world) setN(world, n);
}

function stackHeading(v, epg, nodelist) {
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < epg.length; i++) {
    const idx = epg[i];
    const node = nodelist[idx];
    const a = v[idx] || 0;
    sx += a * node.x;
    sy += a * node.y;
  }
  headingScratch.heading = Math.atan2(sy, sx);
  headingScratch.order = epg.length ? Math.hypot(sx, sy) / epg.length : 0;
  return headingScratch;
}

function writeLayer(out, i, n) {
  const depth = n <= 1 ? 0 : i / (n - 1);
  const scale = 1 / (1 + depth * 1.15);
  const compact = vh < 740;
  out.depth = depth;
  out.scale = scale;
  out.cx = vw * 0.5;
  out.cy = vh * (compact ? 0.46 : 0.58) - depth * vh * (compact ? 0.22 : 0.30);
  out.rx = Math.min(vw, vh) * (compact ? 0.30 : 0.34) * scale;
  out.ry = out.rx * (0.42 + (1 - depth) * 0.14);
}

function geomFor(n) {
  while (geomBuf.length < n) geomBuf.push({ depth: 0, scale: 1, cx: 0, cy: 0, rx: 0, ry: 0 });
  for (let i = 0; i < n; i++) writeLayer(geomBuf[i], i, n);
  return geomBuf;
}

function maskEpg(len, epg) {
  if (epgMask.length !== len) epgMask = new Uint8Array(len);
  else epgMask.fill(0);
  for (let i = 0; i < epg.length; i++) epgMask[epg[i]] = 1;
  return epgMask;
}

function cellXY(out, layer, node) {
  out.x = layer.cx + node.x * layer.rx;
  out.y = layer.cy + node.y * layer.ry;
  return out;
}

function drawRingTrack(layer) {
  ctx.beginPath();
  ctx.ellipse(layer.cx, layer.cy, layer.rx, layer.ry, 0, 0, Math.PI * 2);
  const cool = 0.22 + 0.20 * (1 - layer.depth);
  ctx.strokeStyle = `rgba(127, 178, 255, ${cool})`;
  ctx.lineWidth = 1.25;
  ctx.stroke();
}

function drawInner(v, nodelist, epgSet, layer) {
  const fade = 0.28 + 0.52 * (1 - layer.depth);
  for (let i = 0; i < nodelist.length; i++) {
    if (epgSet[i]) continue;
    const node = nodelist[i];
    const mag = Math.abs(v[i] || 0);
    const p = cellXY(ptA, layer, node);
    const r = (1.15 + mag * 1.6) * layer.scale;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = node.inh
      ? `rgba(165, 224, 255, ${(0.10 + mag * 0.28) * fade})`
      : `rgba(127, 178, 255, ${(0.12 + mag * 0.32) * fade})`;
    ctx.fill();
  }
}

function drawEpg(v, nodelist, epg, layer) {
  const fade = 0.42 + 0.58 * (1 - layer.depth);
  for (let i = 0; i < epg.length; i++) {
    const idx = epg[i];
    const node = nodelist[idx];
    const mag = Math.abs(v[idx] || 0);
    const p = cellXY(ptA, layer, node);
    const r = (2.8 + mag * 5.2) * layer.scale;
    const heat = mag < 0.58 ? 0 : Math.min(1, (mag - 0.58) / 0.28);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(127, 178, 255, ${(0.14 + mag * 0.38) * fade})`;
    ctx.fill();
    if (heat > 0) {
      fillNacreDot(p.x, p.y, r, PEARL, heat * (0.42 + mag * 0.48) * fade);
    }
  }
}

function drawTick(layer, heading) {
  const nx = Math.cos(heading);
  const ny = Math.sin(heading);
  const x0 = layer.cx + nx * layer.rx * 0.90;
  const y0 = layer.cy + ny * layer.ry * 0.90;
  const x1 = layer.cx + nx * layer.rx * 1.14;
  const y1 = layer.cy + ny * layer.ry * 1.14;
  const fade = 0.55 + 0.45 * (1 - layer.depth);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = `rgba(242, 238, 230, ${0.72 * fade})`;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x1, y1, 2.1 * layer.scale, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(242, 238, 230, ${0.88 * fade})`;
  ctx.fill();
}

function drawFilaments(near, far, nearL, farL, epg, nodelist) {
  ctx.lineCap = "round";
  for (let i = 0; i < epg.length; i++) {
    const idx = epg[i];
    const a = near.v[idx] || 0;
    const b = far.v[idx] || 0;
    const agree = Math.max(0, 1 - Math.abs(a - b));
    if (agree < 0.04) continue;
    const p0 = cellXY(ptA, nearL, nodelist[idx]);
    const p1 = cellXY(ptB, farL, nodelist[idx]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.strokeStyle = `rgba(165, 224, 255, ${0.05 + agree * 0.36})`;
    ctx.lineWidth = 1.15;
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, vw, vh);
  if (!world) return;
  const layers = stacks(world);
  const nodelist = nodes(world);
  const epg = epgIndex(world);
  if (!layers || !nodelist || !epg) return;
  const n = layers.length;
  const epgSet = maskEpg(nodelist.length, epg);
  const geom = geomFor(n);

  ctx.save();
  for (let i = n - 2; i >= 0; i--) {
    drawFilaments(layers[i], layers[i + 1], geom[i], geom[i + 1], epg, nodelist);
  }
  for (let i = n - 1; i >= 0; i--) {
    const v = layers[i].v;
    const layer = geom[i];
    const read = stackHeading(v, epg, nodelist);
    drawRingTrack(layer);
    drawInner(v, nodelist, epgSet, layer);
    drawEpg(v, nodelist, epg, layer);
    drawTick(layer, read.heading);
  }
  ctx.restore();
}

function frame() {
  if (world && !paused) step(world);
  if (world) {
    const m = metrics(world);
    writeTelemetry(m);
    verseEl.textContent = line(m);
  }
  draw();
  requestAnimationFrame(frame);
}

function bindUi() {
  sliderK.addEventListener("input", () => applyK(sliderK.value));
  sliderN.addEventListener("input", () => applyN(sliderN.value));
  btnPause.addEventListener("click", () => setPaused(!paused));
  btnPanels.addEventListener("click", () => setPanels(!panelsOn));
  window.addEventListener("keydown", (ev) => {
    if (ev.code === "Space") {
      ev.preventDefault();
      if (ev.repeat) return;
      setPaused(!paused);
      return;
    }
    if (ev.key === "h" || ev.key === "H") {
      if (ev.repeat) return;
      setPanels(!panelsOn);
    }
  });
  window.addEventListener("resize", resize);
}

async function boot() {
  bindUi();
  resize();
  const graph = await load();
  if (!graph) {
    verseEl.textContent = "The motif has not arrived.";
    requestAnimationFrame(frame);
    return;
  }
  world = create(graph, {
    N: clampInt(sliderN.value, 1, 8),
    K: clampInt(sliderK.value, 1, 16),
  });
  requestAnimationFrame(frame);
}

boot();
