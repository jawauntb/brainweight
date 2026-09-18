// Field notes. Advance only when the visitor plays.
// The point is why the stack matters, not a caption for the art.

export const HOLD = 180;

export const BEATS = [
  {
    id: "touch",
    need: null,
    text: "Drag the ring. This is a fly heading circuit. You are pointing.",
  },
  {
    id: "steer",
    need: "steer",
    text: "A ring attractor. EPG holds a bump. PEN shifts it. 47 cells, not a fly.",
  },
  {
    id: "kick",
    need: "kick",
    text: "J breaks the lock. Copies that agree are still one motif.",
  },
  {
    id: "pair",
    need: "pair",
    text: "Each unit is the motif plus a tiny transformer. Wiring is the prior. T is the mixer.",
  },
  {
    id: "res",
    need: "res",
    text: "Corollary discharge. The top predicted the floor. Residual is the miss, not a thought.",
  },
  {
    id: "analog",
    need: "analog",
    text: "Analog interference. Miller 2026. W stores. Neighbors add or cancel. intf is that sum.",
  },
  {
    id: "mass",
    need: "mass",
    text: "9.4e6 units. About 754 g of motif. Pairing cut the copies. Not a human brain.",
  },
];

export function createField() {
  return {
    i: 0,
    held: 0,
    saw: { steer: false, kick: false, res: false, analog: false },
  };
}

export function currentField(field) {
  const i = field && Number.isInteger(field.i) ? field.i : 0;
  const beat = BEATS[i] || BEATS[0];
  return {
    i,
    n: BEATS.length,
    id: beat.id,
    text: beat.text,
  };
}

export function noteField(field, ev, m) {
  if (!field || !field.saw) return currentField(field);
  if (ev === "steer" || ev === "target") field.saw.steer = true;
  if (ev === "kick") field.saw.kick = true;
  const res = m && Number(m.residual);
  if (Number.isFinite(res) && res > 0.06) field.saw.res = true;
  const intf = m && Number(m.intf);
  const wave = m && Number(m.wave);
  if ((Number.isFinite(intf) && Math.abs(intf) > 0.04) || (Number.isFinite(wave) && wave > 0.035)) {
    field.saw.analog = true;
  }
  if (ev === "tick") field.held = (field.held || 0) + 1;
  else field.held = HOLD;
  if (canAdvance(field)) {
    field.i += 1;
    field.held = 0;
  }
  return currentField(field);
}

function canAdvance(field) {
  const next = BEATS[field.i + 1];
  if (!next) return false;
  if (next.need === "steer") return field.saw.steer;
  if (next.need === "kick") return field.saw.kick;
  if ((field.held || 0) < HOLD) return false;
  if (next.need === "pair") return field.saw.steer && field.saw.kick;
  if (next.need === "res") return field.saw.res;
  if (next.need === "analog") return field.saw.analog;
  if (next.need === "mass") return field.saw.steer && field.saw.kick && field.saw.res && field.saw.analog;
  return false;
}
