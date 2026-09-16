import { load, create, setN, setK, step, metrics, stacks, nodes, epgIndex, setTarget, kick, wander } from "./loop.js";
import { line } from "./verse.js";
import { armThink, requestThink, requestMass, thinkStats, massStats } from "./think.js";
import { formatGrams, formatCopies, TARGET_COPIES } from "./mass.js";

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
const btnKick = document.getElementById("btn-kick");
const btnPanels = document.getElementById("btn-panels");
const chromeEls = document.querySelectorAll(".chrome");
const tK = document.getElementById("t-k");
const tN = document.getElementById("t-n");
const tR = document.getElementById("t-r");
const tCorr = document.getElementById("t-corr");
const tRes = document.getElementById("t-res");
const tReg = document.getElementById("t-reg");
const tIntf = document.getElementById("t-intf");
const tCx = document.getElementById("t-cx");
const tScore = document.getElementById("t-score");
const tErr = document.getElementById("t-err");
const tG = document.getElementById("t-g");
const tGpu = document.getElementById("t-gpu");
const tMass = document.getElementById("t-mass");
const thoughtsEl = document.getElementById("thoughts");
const thoughtLog = [];

let world = null;
let paused = false;
let frameNo = 0;
let panelsOn = true;
let vw = 0;
let vh = 0;
let steering = false;
let aim = null;

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
  if (tReg) tReg.textContent = m.gesture || m.regime || "idle";
  if (tIntf) tIntf.textContent = fmt(m.intf, 2);
  if (tCx) tCx.textContent = m.circuit || "epg";
  if (tScore) tScore.textContent = fmt(m.score, 2);
  if (tErr) tErr.textContent = fmt(m.error, 2);
  if (tG) tG.textContent = fmt(m.g, 2);
  const remote = thinkStats();
  const weighed = massStats();
  if (tGpu) tGpu.textContent = remote.ok ? (remote.device || "L4") : (remote.reason || "local");
  if (tMass) {
    if (weighed && weighed.ok) {
      tMass.textContent = `${formatCopies(weighed.N)}/${formatCopies(TARGET_COPIES)}`;
      if (tReg && weighed.regime && !m.gesture) tReg.textContent = weighed.regime;
      if (tIntf && Number.isFinite(weighed.intf)) tIntf.textContent = fmt(weighed.intf, 2);
      if (tScore && Number.isFinite(weighed.score)) tScore.textContent = fmt(weighed.score, 2);
      if (tErr && Number.isFinite(weighed.error)) tErr.textContent = fmt(weighed.error, 2);
    } else {
      tMass.textContent = `${formatGrams(m.mass_g)}/${formatCopies(TARGET_COPIES)}`;
    }
  }
}

function writeThoughts(m) {
  if (!thoughtsEl) return;
  const score = Number.isFinite(m.score) ? m.score.toFixed(2) : "0.00";
  const err = Number.isFinite(m.error) ? m.error.toFixed(2) : "0.00";
  const line = `${m.regime || "idle"}  ${m.circuit || "epg"}  score ${score}  err ${err}`;
  const last = thoughtLog[thoughtLog.length - 1];
  if (last === line) return;
  thoughtLog.push(line);
  if (thoughtLog.length > 5) thoughtLog.shift();
  thoughtsEl.replaceChildren();
  for (let i = 0; i < thoughtLog.length; i++) {
    const li = document.createElement("li");
    li.textContent = thoughtLog[i];
    thoughtsEl.appendChild(li);
  }
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
    const heat = mag < 0.18 ? 0 : Math.min(1, (mag - 0.18) / 0.42);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(127, 178, 255, ${(0.14 + mag * 0.38) * fade})`;
    ctx.fill();
    if (heat > 0) {
      fillNacreDot(p.x, p.y, r, PEARL, heat * (0.42 + mag * 0.48) * fade);
    }
  }
}

function drawHeadingGlow(layer, heading, order) {
  const span = 0.55;
  ctx.beginPath();
  for (let t = heading - span; t <= heading + span; t += 0.05) {
    const x = layer.cx + Math.cos(t) * layer.rx;
    const y = layer.cy + Math.sin(t) * layer.ry;
    if (t === heading - span) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = `rgba(246, 214, 122, ${0.16 + order * 0.42})`;
  ctx.lineWidth = 3.4 * layer.scale;
  ctx.lineCap = "round";
  ctx.stroke();
  const x = layer.cx + Math.cos(heading) * layer.rx;
  const y = layer.cy + Math.sin(heading) * layer.ry;
  fillNacreDot(x, y, (7.5 + order * 6) * layer.scale, PEARL, 0.28 + order * 0.46);
}

function drawTarget(layer, heading) {
  const nx = Math.cos(heading);
  const ny = Math.sin(heading);
  const x0 = layer.cx + nx * layer.rx * 0.78;
  const y0 = layer.cy + ny * layer.ry * 0.78;
  const x1 = layer.cx + nx * layer.rx * 1.26;
  const y1 = layer.cy + ny * layer.ry * 1.26;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = "rgba(255, 209, 92, 0.92)";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.setLineDash([3, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x1, y1, 3.8 * layer.scale, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 209, 92, 0.95)";
  ctx.fill();
}

function drawAim(layer, heading) {
  const nx = Math.cos(heading);
  const ny = Math.sin(heading);
  const x0 = layer.cx + nx * layer.rx * 0.72;
  const y0 = layer.cy + ny * layer.ry * 0.72;
  const x1 = layer.cx + nx * layer.rx * 1.22;
  const y1 = layer.cy + ny * layer.ry * 1.22;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = "rgba(246, 214, 122, 0.92)";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x1, y1, 3.4 * layer.scale, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(246, 214, 122, 0.95)";
  ctx.fill();
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
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(246, 214, 122, ${world.flash * 0.10})`;
    ctx.fillRect(0, 0, vw, vh);
    world.flash *= 0.84;
    if (world.flash < 0.02) world.flash = 0;
  }
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
    if (i === 0) drawHeadingGlow(layer, read.heading, read.order);
    drawInner(v, nodelist, epgSet, layer);
    drawEpg(v, nodelist, epg, layer);
    drawTick(layer, read.heading);
    if (i === 0 && Number.isFinite(world.target)) drawTarget(layer, world.target);
    if (i === 0 && aim != null) drawAim(layer, aim);
  }
  ctx.restore();
}

function headingFromPointer(ev) {
  const layer = geomFor(world && world.N ? world.N : 1)[0];
  return Math.atan2(ev.clientY - layer.cy, ev.clientX - layer.cx);
}

function steerTo(heading) {
  if (!world) return;
  aim = heading;
  setTarget(world, heading);
}

function doKick() {
  if (!world) return;
  kick(world);
  aim = null;
  armThink();
}

function frame() {
  if (world && !paused) {
    if (!steering) wander(world);
    step(world);
    frameNo += 1;
  }
  if (world) {
    const m = metrics(world);
    const weighed = massStats();
    const said = (weighed && weighed.ok && weighed.fraction >= 0.99)
      ? {
        ...m,
        fraction: weighed.fraction,
        regime: weighed.regime || m.regime,
        intf: Number.isFinite(weighed.intf) ? weighed.intf : m.intf,
        wave: Number.isFinite(weighed.wave) ? weighed.wave : m.wave,
      }
      : m;
    writeTelemetry(m);
    verseEl.textContent = line(said);
    writeThoughts(m);
    requestThink(world, frameNo, m);
    requestMass(world, m);
  }
  draw();
  requestAnimationFrame(frame);
}

function bindUi() {
  sliderK.addEventListener("input", () => applyK(sliderK.value));
  sliderN.addEventListener("input", () => applyN(sliderN.value));
  btnPause.addEventListener("click", () => setPaused(!paused));
  if (btnKick) btnKick.addEventListener("click", doKick);
  btnPanels.addEventListener("click", () => setPanels(!panelsOn));
  stage.addEventListener("pointerdown", (ev) => {
    if (!world || ev.button !== 0) return;
    steering = true;
    stage.classList.add("is-steering");
    try { stage.setPointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
    steerTo(headingFromPointer(ev));
    armThink();
  });
  stage.addEventListener("pointermove", (ev) => {
    if (!steering || !world) return;
    steerTo(headingFromPointer(ev));
  });
  const endSteer = (ev) => {
    if (!steering) return;
    steering = false;
    stage.classList.remove("is-steering");
    aim = null;
    if (ev && ev.pointerId != null) {
      try { stage.releasePointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
    }
  };
  stage.addEventListener("pointerup", endSteer);
  stage.addEventListener("pointercancel", endSteer);
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
      return;
    }
    if (ev.key === "j" || ev.key === "J") {
      if (ev.repeat) return;
      doKick();
      return;
    }
    if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
      ev.preventDefault();
      if (!world) return;
      const stepH = ev.key === "ArrowLeft" ? -0.38 : 0.38;
      steerTo((world.target || 0) + stepH);
      armThink();
    }
  });
  const arm = () => armThink();
  window.addEventListener("pointerdown", arm, { once: true });
  window.addEventListener("keydown", arm, { once: true });
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
