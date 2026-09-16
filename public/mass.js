// Wet-mass accounting. Human grams and fly micrograms are cited in README.
// Fly wet mass is estimated from Zheng volume, not a weighing.

export const HUMAN_G = 1508;
export const MOTIF_FULL = 18850000;
export const TARGET_COPIES = 9425000;
export const FLY_WET_G = HUMAN_G / MOTIF_FULL;
// Cell-count split, not a weighing. Raji and Potter: fly neurons are 91.8% of brain cells.
export const FLY_NEURON_CELL = 0.918;

export function wetGrams(copies) {
  const n = Number(copies);
  if (!Number.isFinite(n) || n < 0) return 0;
  return HUMAN_G * (n / MOTIF_FULL);
}

export function massFraction(copies) {
  const n = Number(copies);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n === TARGET_COPIES) return 1;
  return n / TARGET_COPIES;
}

export function motifFraction(copies) {
  const n = Number(copies);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n / MOTIF_FULL;
}

export function splitGrams(copies) {
  const wet_g = wetGrams(copies);
  const neuron_g = wet_g * FLY_NEURON_CELL;
  return { wet_g, neuron_g, tissue_g: wet_g - neuron_g };
}

export function formatGrams(g) {
  if (!Number.isFinite(g) || g === 0) return "0g";
  if (g >= 1) return `${g.toFixed(g >= 100 ? 0 : 2)}g`;
  if (g >= 1e-3) return `${(g * 1e3).toFixed(2)}mg`;
  return `${(g * 1e6).toFixed(1)}μg`;
}

export function formatCopies(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return "0";
  if (v >= 1e4) return v.toExponential(1).replace("+", "");
  return String(Math.round(v));
}
