// Deferred deep clock. HTTP only. No websocket (kills scale-to-zero).
// Do not call GPU on first paint, in the first 8s, or before a gesture.
// Mass is 9.4e6 paired units on the L4. One unit is motif W plus a tiny T.

import { TARGET_COPIES } from "./mass.js";

const OPENING_MS = 8000;
const CADENCE_MS = 4000;

const clock = {
  armed: false,
  born: 0,
  lastAt: 0,
  inflight: false,
  last: { ok: false, gpu: false, n: 0, e: 0, ms: 0, reason: 'idle' },
  mass: null,
  massInflight: false,
  world: null,
  m: null,
};

export function thinkStats() {
  return clock.last;
}

export function massStats() {
  return clock.mass;
}

export function armThink() {
  if (!clock.born) clock.born = performance.now();
  clock.armed = true;
}

export function gatherThink(world, frame, m) {
  const minds = [];
  const seeds = world && world.seeds ? world.seeds : [];
  const N = (m && m.N) || 1;
  for (let i = 0; i < N; i++) {
    minds.push({
      seed: seeds[i] || 0.37,
      species: 'wolf',
      drive: (m && m.order) || 0,
      k: (m && m.K) || 4,
    });
  }
  return {
    field: 'brainweight',
    frame: frame || 0,
    N,
    K: (m && m.K) || 4,
    residual: (m && m.residual) || 0,
    order: (m && m.order) || 0,
    corr: (m && m.corr) || 0,
    heading: (m && m.heading) || 0,
    target: (m && m.target) || 0,
    score: (m && m.score) || 0,
    minds,
  };
}

export async function requestThink(world, frame, m) {
  const now = performance.now();
  if (!clock.born) clock.born = now;
  if (!clock.armed) {
    clock.last = { ok: false, gpu: false, n: 0, e: 0, ms: 0, reason: 'gesture' };
    return null;
  }
  if (now - clock.born < OPENING_MS) {
    clock.last = { ok: false, gpu: false, n: 0, e: 0, ms: 0, reason: 'opening' };
    return null;
  }
  if (clock.inflight) return null;
  if (now - clock.lastAt < CADENCE_MS) return null;
  clock.inflight = true;
  clock.lastAt = now;
  try {
    const res = await fetch('/think', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(gatherThink(world, frame, m)),
    });
    const data = await res.json();
    if (data && data.ok) {
      clock.last = {
        ok: true,
        gpu: !!data.gpu,
        n: data.n || 0,
        e: data.e || 0,
        ms: data.ms || 0,
        device: data.device || 'L4',
        dataset: data.dataset || '',
        reason: 'ok',
      };
    } else {
      clock.last = {
        ok: false,
        gpu: false,
        n: 0,
        e: 0,
        ms: 0,
        reason: (data && data.reason) || 'down',
      };
    }
    return data;
  } catch {
    clock.last = { ok: false, gpu: false, n: 0, e: 0, ms: 0, reason: 'down' };
    return null;
  } finally {
    clock.inflight = false;
  }
}

export async function requestMass(world, m) {
  if (world) clock.world = world;
  if (m) clock.m = m;
  const now = performance.now();
  if (!clock.born) clock.born = now;
  if (!clock.armed) return null;
  if (now - clock.born < OPENING_MS) return null;
  if (clock.massInflight) return null;
  clock.massInflight = true;
  try {
    const res = await fetch("/think/mass", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "mass",
        N: TARGET_COPIES,
        K: (m && m.K) || 4,
        target: (world && Number.isFinite(world.target)) ? world.target : ((m && m.target) || 0),
        glia_frac: 0.5,
      }),
    });
    const data = await res.json();
    if (data && data.ok && data.N !== TARGET_COPIES) {
      clock.mass = {
        ok: false,
        gpu: !!data.gpu,
        mode: "mass",
        n: data.n || 0,
        e: data.e || 0,
        ms: data.ms || 0,
        N: data.N || 0,
        reason: "short",
      };
    } else if (data && data.ok) {
      clock.mass = {
        ok: true,
        gpu: true,
        mode: "mass",
        n: data.n || 47,
        e: data.e || 280,
        ms: data.ms || 0,
        device: data.device || "L4",
        N: data.N || TARGET_COPIES,
        fraction: data.fraction || 0,
        mass_g: data.mass_g || 0,
        residual: data.residual || 0,
        corr: data.corr || 0,
        intf: data.intf || 0,
        wave: data.wave || 0,
        regime: data.regime || "weight",
        tissue_g: data.tissue_g || 0,
        neuron_g: data.neuron_g || 0,
        heading: data.heading || 0,
        target: data.target || 0,
        error: data.error || 0,
        score: data.score || 0,
        gain: data.gain || 0,
        g: data.g || 0,
        steps: data.steps || 0,
        live: !!data.live,
        pair: data.pair !== false,
        motif_frac: data.motif_frac || 0,
        reason: "weight",
      };
    } else {
      clock.mass = {
        ok: false,
        gpu: false,
        mode: "mass",
        n: 0,
        e: 0,
        ms: 0,
        reason: (data && (data.reason || data.error)) || "down",
      };
    }
    return data;
  } catch {
    clock.mass = { ok: false, gpu: false, mode: "mass", n: 0, e: 0, ms: 0, reason: "down" };
    return null;
  } finally {
    clock.massInflight = false;
    if (clock.armed) {
      const ok = clock.mass && clock.mass.ok;
      const wait = ok ? 400 : 8000;
      setTimeout(() => requestMass(clock.world, clock.m), wait);
    }
  }
}
