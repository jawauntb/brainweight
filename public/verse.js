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
  wave: [
    "A traveling wave. The heading is walking.",
    "The bump is moving around the ring.",
    "Order holds while the compass turns.",
  ],
  analog: [
    "Waves are adding. The tissue is computing.",
    "Constructive interference. The connective field agrees.",
    "Same W. The analog sum is doing the work.",
  ],
  cancel: [
    "Waves are canceling. The tissue is subtracting.",
    "Destructive interference. Neighbor stacks undo each other.",
    "The connective field is a difference, not a chorus.",
  ],
  second: [
    "Second-order prediction. The error itself is stable.",
    "The stack is predicting how it will miss.",
    "Residual is changing less than the thought.",
  ],
  cancer: [
    "One stack has isolated. Language cancer.",
    "A copy stopped listening. The rest still agree.",
    "Isolation. One ring is speaking only to itself.",
  ],
  idle: [
    "The rings are still finding a heading.",
    "Activity without a compass yet.",
    "Waiting for a bump to lock.",
  ],
  weight: [
    "The stack now weighs a human brain.",
    "1.9e7 copies, neurons plus connective tissue.",
    "Same wet mass. Still a fly motif.",
  ],
};

let clock = 0;
let lastKey = "idle";

function num(v, fallback) {
  return Number.isFinite(v) ? v : fallback;
}

function regime(m) {
  if (m && Number(m.fraction) >= 0.99) {
    if (m.regime && m.regime !== "idle" && m.regime !== "weight") return m.regime;
    return "weight";
  }
  if (m && m.regime) return m.regime;
  const N = num(m && m.N, 1);
  const K = num(m && m.K, 1);
  if (N === 1 && K === 1) return "both";
  if (N === 1) return "noN";
  if (K === 1) return "noK";
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
