const BANK = {
  both: [
    "One stack, one pass. Both axes are missing.",
    "Depth and population sit at one.",
    "A thought needs a loop and a chorus.",
  ],
  noN: [
    "One stack. Population is the missing axis.",
    "N is one. There is no chorus to agree with.",
    "A single ring cannot desync.",
  ],
  noK: [
    "One pass. Depth is the missing axis.",
    "K is one. The motif does not loop.",
    "Without depth the stack cannot think twice.",
  ],
  heading: [
    "The ring is holding a heading.",
    "A bump has a place on the compass.",
    "Order is up. Direction is sitting still.",
  ],
  reaffer: [
    "The top is predicting the bottom.",
    "Reafference is quiet. The echo matches.",
    "The stack hears its own next state.",
  ],
  lie: [
    "The stack is lying to itself.",
    "The top does not predict the floor.",
    "Residual is high. The echo is a different story.",
  ],
  agree: [
    "Copies agree.",
    "The stacks share a heading.",
    "Population is one voice.",
  ],
  fission: [
    "The copies are coming apart.",
    "Fission. Each ring keeps its own heading.",
    "Desync. Correlation has fallen.",
  ],
  idle: [
    "The rings are still finding a heading.",
    "Activity without a compass yet.",
    "Waiting for a bump to lock.",
  ],
};

let clock = 0;
let lastKey = "idle";

function num(v, fallback) {
  return Number.isFinite(v) ? v : fallback;
}

function regime(m) {
  const N = num(m && m.N, 1);
  const K = num(m && m.K, 1);
  if (N === 1 && K === 1) return "both";
  if (N === 1) return "noN";
  if (K === 1) return "noK";

  const order = num(m && m.order, 0);
  const corr = num(m && m.corr, 0);
  const residual = num(m && m.residual, 0);

  if (residual > 0.24) return "lie";
  if (corr < 0.38) return "fission";
  if (order > 0.30 && residual < 0.09) return "reaffer";
  if (order > 0.30) return "heading";
  if (corr > 0.75) return "agree";
  if (residual < 0.08 && order > 0.18) return "reaffer";
  return "idle";
}

export function line(m) {
  const key = regime(m);
  if (key !== lastKey) {
    lastKey = key;
    clock = 0;
  } else {
    clock += 1;
  }
  const lines = BANK[key] || BANK.idle;
  return lines[Math.floor(clock / 160) % lines.length];
}
