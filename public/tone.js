// Compass tone. Armed on a gesture. No autoplay.
// Heading is pitch. Score is the interval. Residual is roughness.

const BASE = 196;
const MASTER = 0.055;

const voice = {
  ctx: null,
  armed: false,
  muted: false,
  master: null,
  heading: null,
  interval: null,
  drone: null,
};

export function headingHz(heading) {
  let h = Number(heading);
  if (!Number.isFinite(h)) h = 0;
  const turn = (h / (Math.PI * 2) + 1) % 1;
  return BASE * Math.pow(2, turn);
}

export function intervalRatio(score) {
  const s = Number(score);
  const x = Number.isFinite(s) ? Math.max(0, Math.min(1, s)) : 0;
  return 1.06 + x * 0.44;
}

export function planTone(m) {
  const hz = headingHz(m && m.heading);
  const ratio = intervalRatio(m && m.score);
  const order = Number(m && m.order);
  const res = Number(m && m.residual);
  const o = Number.isFinite(order) ? Math.max(0, Math.min(1, order)) : 0;
  const rough = Number.isFinite(res) ? Math.max(0, Math.min(0.4, res)) : 0;
  return {
    hz,
    ratio,
    gain: 0.012 + o * MASTER,
    rough,
  };
}

export function isArmed() {
  return !!voice.armed;
}

export function isMuted() {
  return !!voice.muted;
}

export function armTone() {
  if (voice.armed) {
    if (voice.ctx && voice.ctx.state === "suspended") {
      voice.ctx.resume().catch(() => {});
    }
    return voice.armed;
  }
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) {
    voice.armed = true;
    return true;
  }
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const heading = ctx.createOscillator();
  heading.type = "sine";
  heading.frequency.value = BASE;
  const hGain = ctx.createGain();
  hGain.gain.value = 0.42;
  heading.connect(hGain);
  hGain.connect(master);

  const interval = ctx.createOscillator();
  interval.type = "triangle";
  interval.frequency.value = BASE * 1.5;
  const iGain = ctx.createGain();
  iGain.gain.value = 0.18;
  interval.connect(iGain);
  iGain.connect(master);

  const drone = ctx.createOscillator();
  drone.type = "sine";
  drone.frequency.value = BASE * 0.5;
  const dGain = ctx.createGain();
  dGain.gain.value = 0.22;
  drone.connect(dGain);
  dGain.connect(master);

  heading.start();
  interval.start();
  drone.start();

  voice.ctx = ctx;
  voice.master = master;
  voice.heading = heading;
  voice.interval = interval;
  voice.drone = drone;
  voice.armed = true;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return true;
}

export function setMuted(on) {
  voice.muted = !!on;
  if (voice.master && voice.ctx) {
    const t = voice.ctx.currentTime;
    voice.master.gain.setTargetAtTime(voice.muted ? 0 : MASTER * 0.4, t, 0.04);
  }
  return voice.muted;
}

export function hear(m) {
  if (!voice.armed || voice.muted || !voice.ctx || !voice.master) return planTone(m);
  const p = planTone(m);
  const t = voice.ctx.currentTime;
  voice.heading.frequency.setTargetAtTime(p.hz, t, 0.05);
  voice.interval.frequency.setTargetAtTime(p.hz * p.ratio, t, 0.05);
  voice.drone.detune.setTargetAtTime(p.rough * 36, t, 0.08);
  voice.master.gain.setTargetAtTime(p.gain, t, 0.08);
  return p;
}

export function kickTone() {
  if (!voice.armed || voice.muted || !voice.ctx || !voice.master) return false;
  const ctx = voice.ctx;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.16);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.connect(g);
  g.connect(voice.master);
  osc.start(t);
  osc.stop(t + 0.2);
  return true;
}
