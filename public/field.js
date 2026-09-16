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
    text: "EPG holds a direction. PEN shifts it. 47 cells, not a fly, not a person.",
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
    text: "res is the top failing to predict the floor. Zero is a lock, not a thought.",
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
    saw: { steer: false, kick: false, res: false },
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
  if (next.need === "mass") return field.saw.steer && field.saw.kick && field.saw.res;
  return false;
}
