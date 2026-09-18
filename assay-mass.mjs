// Assay: 9,425,000 paired units. One unit is motif W plus a tiny transformer T.
// Motif-only wet mass at that count is half of 1508 g. Pairing is not a weighing.
// Exit 0 and print PASS. Exit 1 on any failure.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  TARGET_COPIES,
  MOTIF_FULL,
  HUMAN_G,
  wetGrams,
  massFraction,
  motifFraction,
} from "./public/mass.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function fail(msg) {
  process.stderr.write(`FAIL: ${msg}\n`);
  process.exit(1);
}

if (MOTIF_FULL !== 18850000) fail(`MOTIF_FULL is ${MOTIF_FULL}, not 18850000`);
if (TARGET_COPIES !== 9425000) fail(`TARGET_COPIES is ${TARGET_COPIES}, not 9425000`);
if (TARGET_COPIES * 2 !== MOTIF_FULL) fail("pair cut is not 50% of motif-full");
if (wetGrams(TARGET_COPIES) !== HUMAN_G * 0.5) {
  fail(`wetGrams(9.4e6) is ${wetGrams(TARGET_COPIES)}, not ${HUMAN_G * 0.5}`);
}
if (wetGrams(TARGET_COPIES) === HUMAN_G) fail("paired target still reports 1508 g");
if (massFraction(TARGET_COPIES) !== 1) fail(`massFraction(9.4e6) is ${massFraction(TARGET_COPIES)}, not 1`);
if (motifFraction(TARGET_COPIES) !== 0.5) fail(`motifFraction(9.4e6) is ${motifFraction(TARGET_COPIES)}, not 0.5`);

const py = readFileSync(join(__dirname, "modal_mind", "app.py"), "utf8");
if (!py.includes("TARGET_COPIES = 9425000")) fail("modal app missing TARGET_COPIES = 9425000");
if (!py.includes("MOTIF_FULL = 18850000")) fail("modal app missing MOTIF_FULL");
if (!py.includes("N = TARGET_COPIES")) fail("mass mode does not force N = TARGET_COPIES");
if (!py.includes("_apply_t_tile")) fail("mass mode does not apply tiled T");
if (!py.includes("\"pair\": True") && !py.includes('"pair": True')) fail("mass mode does not mark pair");
if (py.includes("_mass_last")) fail("mass result cache is back; the stack must keep looping");
if (!py.includes("_mass_live")) fail("mass live state is missing");

const loop = readFileSync(join(__dirname, "public", "loop.js"), "utf8");
if (!loop.includes("export function applyT")) fail("loop.js missing applyT");
if (!loop.includes("applyW(vs[i], graph.edges, _inc, world.gainEff)")) {
  fail("loop.js step dropped applyW");
}
if (!loop.includes("applyT(vs[i], graph.nodes, world._tbuf")) {
  fail("loop.js step does not apply T after W");
}

const think = readFileSync(join(__dirname, "public", "think.js"), "utf8");
if (think.includes("massAsked")) fail("think.js one-shots mass; the paired stack must keep looping");
if (!think.includes("N: TARGET_COPIES")) fail("think.js does not send N: TARGET_COPIES");
if (!think.includes("data.N !== TARGET_COPIES")) fail("think.js does not reject a short stack");

const html = readFileSync(join(__dirname, "public", "index.html"), "utf8");
if (!html.includes("9.4e6 units")) fail("index.html does not name the 9.4e6 paired units");
if (html.includes("1.9e7 connectomes, stacked and looped")) {
  fail("index.html still names the 1.9e7 motif-only stack as the brain");
}

process.stdout.write(
  `mass: N=${TARGET_COPIES} grams=${wetGrams(TARGET_COPIES)} ` +
    `motif_frac=${motifFraction(TARGET_COPIES)} pair=W+T live-loop\n`
);
process.stdout.write("PASS\n");
