// Assay: the brain is 18,850,000 stacked, looped copies. Nothing smaller.
// Exit 0 and print PASS. Exit 1 on any failure.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { TARGET_COPIES, HUMAN_G, wetGrams, massFraction } from "./public/mass.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function fail(msg) {
  process.stderr.write(`FAIL: ${msg}\n`);
  process.exit(1);
}

if (TARGET_COPIES !== 18850000) fail(`TARGET_COPIES is ${TARGET_COPIES}, not 18850000`);
if (wetGrams(TARGET_COPIES) !== HUMAN_G) fail(`wetGrams(1.9e7) is ${wetGrams(TARGET_COPIES)}, not ${HUMAN_G}`);
if (massFraction(TARGET_COPIES) !== 1) fail(`massFraction(1.9e7) is ${massFraction(TARGET_COPIES)}, not 1`);

const py = readFileSync(join(__dirname, "modal_mind", "app.py"), "utf8");
if (!py.includes("TARGET_COPIES = 18850000")) fail("modal app missing TARGET_COPIES = 18850000");
if (!py.includes("N = TARGET_COPIES")) fail("mass mode does not force N = TARGET_COPIES");
if (py.includes("_mass_last")) fail("mass result cache is back; the stack must keep looping");
if (!py.includes("_mass_live")) fail("mass live state is missing");

const think = readFileSync(join(__dirname, "public", "think.js"), "utf8");
if (think.includes("massAsked")) fail("think.js one-shots mass; the 1.9e7 stack must keep looping");
if (!think.includes("N: TARGET_COPIES")) fail("think.js does not send N: TARGET_COPIES");
if (!think.includes("data.N !== TARGET_COPIES")) fail("think.js does not reject a short stack");

const html = readFileSync(join(__dirname, "public", "index.html"), "utf8");
if (!html.includes("1.9e7 connectomes, stacked and looped")) {
  fail("index.html does not name the 1.9e7 stack as the brain");
}

process.stdout.write(`mass: N=${TARGET_COPIES} grams=${wetGrams(TARGET_COPIES)} fraction=1 live-loop\n`);
process.stdout.write("PASS\n");
