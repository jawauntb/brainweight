// Jev questions for the live stack. Typed decisions, no generated text.
// https://docs.typesafe.ai/introduction/quickstart.md
// Local judge is the same schema so the page works without TYPESAFE_API_KEY.

export const MODEL = "jev-latest";
export const JEV_URL = "https://api.typesafe.ai/v1/systemone";

export const VERBS = ["drag", "kick", "wait", "listen"];
export const MATTERS = ["circuit", "pair", "mass", "lock"];

export const LOCK_LEVELS = [
  "Lock. Residual near zero. Copies identical. A statue, not a thought.",
  "Echo. Small residual. The top almost predicts the floor.",
  "Miss. Residual is open. The stack is lying to itself.",
];

export const HINT = {
  drag: "drag the ring. the heading is not the thing it wants.",
  kick: "J. copies agree. that is a lock, not a chorus.",
  wait: "let it seek. score is the only honest number on the ring.",
  listen: "watch res. the top is not predicting the floor.",
};

export const QUESTIONS = {
  verb: {
    type: "choice",
    instructions:
      "Given `stack`, what should a first-time visitor do next? drag: point the ring. kick: break a lock of agreeing copies. wait: the stack is already seeking. listen: residual is the thing to watch.",
    criteria: {
      drag: "Heading error is open or they have not pointed.",
      kick: "Copies agree and residual is a lock.",
      wait: "The stack is turning toward a target.",
      listen: "Residual is high. The top missed the floor.",
    },
  },
  lock: {
    type: "score",
    instructions: "How much is `stack` a lock versus a miss? Use `stack.residual` and `stack.corr`.",
    criteria: LOCK_LEVELS,
  },
  thought: {
    type: "noul",
    instructions: "Is `stack.residual` large enough that the top does not predict the floor?",
    criteria: {
      true: "Residual is a real miss.",
      false: "Residual is a lock or noise.",
    },
  },
  matter: {
    type: "choice",
    instructions: "Why does this frame matter for someone who thinks this is a human brain?",
    criteria: {
      circuit: "A named fly subgraph is doing the work.",
      pair: "Each unit is motif W plus a tiny transformer.",
      mass: "754 g of motif is not 1508 g of human tissue.",
      lock: "Perfect corr and zero residual are a lock, not intelligence.",
    },
  },
};

export function packState(m, field) {
  const src = m && typeof m === "object" ? m : {};
  return {
    stack: {
      heading: num(src.heading),
      target: num(src.target),
      error: num(src.error),
      score: num(src.score),
      residual: num(src.residual),
      corr: num(src.corr),
      intf: num(src.intf),
      order: num(src.order),
      circuit: src.circuit || "epg",
      regime: src.regime || "idle",
      gesture: src.gesture || null,
      pair: src.pair !== false,
      field: field && field.id ? field.id : null,
    },
    note: "47-cell fly heading motif plus a tiny transformer. Not a fly brain. Not a human brain.",
  };
}

export function judge(state) {
  const stack = (state && state.stack) || {};
  const res = num(stack.residual);
  const corr = num(stack.corr);
  const score = num(stack.score);
  const err = Math.abs(num(stack.error));

  let verb = "wait";
  if (res < 0.06 && corr > 0.85) verb = "kick";
  else if (err > 0.70 || score < 0.45) verb = "drag";
  else if (res > 0.10) verb = "listen";

  let lock = 0;
  if (res >= 0.06 && res < 0.14) lock = 1;
  if (res >= 0.14) lock = 2;

  const thought = res > 0.08 ? clamp01(0.35 + res * 3) : clamp01(res * 2);

  let matter = "circuit";
  if (res < 0.06 && corr > 0.85) matter = "lock";
  else if (stack.field === "mass") matter = "mass";
  else if (stack.pair) matter = "pair";

  return {
    verb: {
      type: "choice",
      choice: verb,
      probabilities: oneHot(VERBS, verb),
      confidence: 0.72,
    },
    lock: {
      type: "score",
      score: lock,
      legend: {
        0: LOCK_LEVELS[0],
        1: LOCK_LEVELS[1],
        2: LOCK_LEVELS[2],
      },
      probabilities: oneHot(["0", "1", "2"], String(lock)),
      confidence: 0.70,
    },
    thought: { type: "noul", noul: thought },
    matter: {
      type: "choice",
      choice: matter,
      probabilities: oneHot(MATTERS, matter),
      confidence: 0.66,
    },
  };
}

export function parseAnswers(answers) {
  if (!answers || typeof answers !== "object") return null;
  const verb = answers.verb && VERBS.indexOf(answers.verb.choice) !== -1
    ? answers.verb.choice
    : null;
  const matter = answers.matter && MATTERS.indexOf(answers.matter.choice) !== -1
    ? answers.matter.choice
    : "circuit";
  const lock = answers.lock ? Number(answers.lock.score) : NaN;
  const thought = answers.thought ? Number(answers.thought.noul) : NaN;
  const confidence = answers.verb ? Number(answers.verb.confidence) : 0;
  if (!verb || !Number.isFinite(lock) || !Number.isFinite(thought)) return null;
  return {
    verb,
    matter,
    lock,
    thought,
    confidence: Number.isFinite(confidence) ? confidence : 0,
  };
}

export function act(parsed) {
  if (!parsed) {
    return { verb: "wait", hint: HINT.wait, thought: 0, lock: 1, matter: "circuit" };
  }
  let verb = parsed.verb;
  if (parsed.thought > 0.72 && parsed.lock >= 1.4) verb = "listen";
  let hint = HINT[verb] || HINT.wait;
  if (parsed.matter === "mass") {
    hint = "9.4e6 units. 754 g of motif. not a human brain.";
  } else if (parsed.matter === "pair" && verb === "wait") {
    hint = "each unit is W plus a tiny T. wiring is the prior.";
  }
  return {
    verb,
    hint,
    thought: parsed.thought,
    lock: parsed.lock,
    matter: parsed.matter,
  };
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function oneHot(keys, pick) {
  const out = {};
  const n = keys.length;
  const p = n ? 1 / n : 0;
  for (let i = 0; i < n; i++) out[keys[i]] = keys[i] === pick ? 0.82 : (1 - 0.82) / Math.max(n - 1, 1) || p;
  return out;
}
