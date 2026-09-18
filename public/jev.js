// Jev questions for the live stack. Typed decisions, no generated text.
// https://docs.typesafe.ai/introduction/quickstart.md
// Local judge is the same schema so the page works without TYPESAFE_API_KEY.

export const MODEL = "jev-latest";
export const JEV_URL = "https://api.typesafe.ai/v1/systemone";

// Jev is also live on OpenRouter (in beta): openrouter.ai/~typesafe/jev-latest.
// That is a chat-completions endpoint, not the native systemone schema above,
// so ask it for the same typed answers as strict JSON in a message.
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const OPENROUTER_DEFAULT_MODEL = "typesafe/jev-latest";

export const VERBS = ["drag", "kick", "wait", "listen"];
export const MATTERS = ["circuit", "pair", "mass", "lock"];
export const MOMENTS = ["reaffer", "lock", "wave", "fission", "seek"];

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

export const MOMENT_HINT = {
  reaffer: "the top predicted the floor. that is an echo, not a mind.",
  lock: "copies agree. a statue, not a chorus.",
  wave: "the bump is walking. analog sum, not a thought.",
  fission: "the copies disagree. population is doing work.",
  seek: "the ring is turning toward the heading you pointed.",
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
  moment: {
    type: "choice",
    instructions:
      "What dynamical fact is live on `stack` right now? This is a 47-cell fly heading motif plus a tiny transformer, stacked and looped. Not a mind. Pick the fact.",
    criteria: {
      reaffer: "The top predicted the floor. Residual is small. An echo.",
      lock: "Copies agree and residual is near zero. A statue.",
      wave: "Heading is walking. Analog interference across copies.",
      fission: "Copies disagree. Population is doing work.",
      seek: "The ring is turning toward a target the visitor pointed.",
    },
  },
  emergent: {
    type: "noul",
    instructions:
      "Is this a regime that needs both population (`stack.N` > 1) and depth (`stack.K` > 1)? True only if a single copy or a single pass would look different.",
    criteria: {
      true: "Wave, interference, fission, or depth change that N=1 or K=1 cannot make.",
      false: "A single ring or a single pass would look the same.",
    },
  },
};

export function buildJevMessages(state) {
  const schema = {
    verb: { choice: VERBS, confidence: "0..1" },
    lock: { score: "0, 1, or 2" },
    thought: { noul: "0..1" },
    matter: { choice: MATTERS },
    moment: { choice: MOMENTS },
    emergent: { noul: "0..1" },
  };
  return [
    {
      role: "system",
      content:
        "You are Jev, TypeSafe's System One model. Answer as strict JSON only, no prose, " +
        "matching this schema: " + JSON.stringify(schema) + ". " +
        "Use the questions and criteria in the user message to choose each field.",
    },
    {
      role: "user",
      content: JSON.stringify({ state, questions: QUESTIONS }),
    },
  ];
}

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
      N: num(src.N),
      K: num(src.K),
      wave: num(src.wave),
      isolate: num(src.isolate),
      depth: num(src.depth),
      mix: num(src.mix),
      passes: Array.isArray(src.passes) ? src.passes.slice(0, 16) : [],
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

  let moment = "seek";
  if (res < 0.06 && corr > 0.85) moment = "lock";
  else if (corr < 0.42) moment = "fission";
  else if (num(stack.wave) > 0.035) moment = "wave";
  else if (res < 0.09 && num(stack.order) > 0.30) moment = "reaffer";

  const pop = num(stack.N);
  const loops = num(stack.K);
  let emergent = 0.08;
  if (pop > 1 && loops > 1) {
    if (Math.abs(num(stack.intf)) > 0.04 || num(stack.wave) > 0.03 || num(stack.depth) > 0.02) {
      emergent = 0.78;
    } else if (corr < 0.42) {
      emergent = 0.64;
    } else {
      emergent = 0.22;
    }
  }

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
    moment: {
      type: "choice",
      choice: moment,
      probabilities: oneHot(MOMENTS, moment),
      confidence: 0.70,
    },
    emergent: { type: "noul", noul: emergent },
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
  const moment = answers.moment && MOMENTS.indexOf(answers.moment.choice) !== -1
    ? answers.moment.choice
    : "seek";
  const emergent = answers.emergent ? Number(answers.emergent.noul) : 0;
  return {
    verb,
    matter,
    lock,
    thought,
    moment,
    emergent: Number.isFinite(emergent) ? clamp01(emergent) : 0,
    confidence: Number.isFinite(confidence) ? confidence : 0,
  };
}

export function act(parsed) {
  if (!parsed) {
    return {
      verb: "wait",
      hint: HINT.wait,
      thought: 0,
      lock: 1,
      matter: "circuit",
      moment: "seek",
      emergent: 0,
      momentHint: MOMENT_HINT.seek,
    };
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
    moment: parsed.moment || "seek",
    emergent: Number.isFinite(parsed.emergent) ? parsed.emergent : 0,
    momentHint: MOMENT_HINT[parsed.moment] || MOMENT_HINT.seek,
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
