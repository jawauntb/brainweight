// Jev coach. HTTP only. No websocket.
// Do not call on first paint or before a gesture.

const CADENCE_MS = 1800;

const clock = {
  armed: false,
  lastAt: 0,
  inflight: false,
  last: { ok: false, source: "idle", reason: "idle" },
};

export function jevStats() {
  return clock.last;
}

export function armJev() {
  clock.armed = true;
}

export async function requestJev(m, field) {
  if (!clock.armed) {
    clock.last = { ok: false, source: "idle", reason: "gesture" };
    return null;
  }
  const now = performance.now();
  if (clock.inflight) return null;
  if (now - clock.lastAt < CADENCE_MS) return null;
  clock.inflight = true;
  clock.lastAt = now;
  try {
    const res = await fetch("/jev", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        metrics: {
          heading: m && m.heading,
          target: m && m.target,
          error: m && m.error,
          score: m && m.score,
          residual: m && m.residual,
          corr: m && m.corr,
          intf: m && m.intf,
          order: m && m.order,
          circuit: m && m.circuit,
          regime: m && m.regime,
          gesture: m && m.gesture,
          pair: m && m.pair,
          N: m && m.N,
          K: m && m.K,
          wave: m && m.wave,
          isolate: m && m.isolate,
          depth: m && m.depth,
          passes: m && m.passes,
        },
        field: field ? { id: field.id, i: field.i } : null,
      }),
    });
    const data = await res.json();
    if (data && data.ok && data.act) {
      clock.last = {
        ok: true,
        source: data.source || "local",
        verb: data.act.verb,
        hint: data.act.hint,
        thought: data.act.thought,
        lock: data.act.lock,
        matter: data.act.matter,
        moment: data.act.moment,
        emergent: data.act.emergent,
        momentHint: data.act.momentHint,
        model: data.model || "",
        ms: data.ms || 0,
        reason: data.source || "local",
      };
    } else {
      clock.last = {
        ok: false,
        source: (data && data.source) || "down",
        reason: (data && data.reason) || "down",
      };
    }
    return data;
  } catch {
    clock.last = { ok: false, source: "down", reason: "down" };
    return null;
  } finally {
    clock.inflight = false;
  }
}
