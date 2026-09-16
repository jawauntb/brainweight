// Assay: a first-time visitor can play, hear, and learn.
// Field notes advance on verbs. Tone is planned without an AudioContext.
// Exit 0 and print PASS. Exit 1 on any failure.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { BEATS, HOLD, createField, noteField, currentField } from "./public/field.js";
import { headingHz, intervalRatio, planTone, isArmed } from "./public/tone.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function fail(msg) {
  process.stderr.write(`FAIL: ${msg}\n`);
  process.exit(1);
}

if (BEATS.length !== 6) fail(`BEATS length ${BEATS.length}, not 6`);
if (HOLD < 120) fail("HOLD is too short to read a note");
if (isArmed()) fail("tone armed itself without a gesture");

const texts = BEATS.map((b) => b.text).join(" ");
if (/weighs a human|is a human brain/i.test(texts)) {
  fail("field copy claims a human brain");
}
if (texts.includes("consciousness")) fail("field copy claims consciousness");
if (!texts.includes("transformer")) fail("field never names the transformer");
if (!texts.includes("754")) fail("field never names motif grams");

const hz0 = headingHz(0);
const hzPi = headingHz(Math.PI);
if (!(hz0 > 0) || !(hzPi > 0)) fail("headingHz is not positive");
if (Math.abs(hz0 - hzPi) < 1) fail("headingHz does not move with heading");
if (intervalRatio(1) <= intervalRatio(0)) fail("score does not open the interval");

const plan = planTone({ heading: 0.4, score: 0.2, order: 0.5, residual: 0.12 });
if (!Number.isFinite(plan.hz) || !Number.isFinite(plan.ratio) || !Number.isFinite(plan.gain)) {
  fail("planTone is not finite");
}
if (plan.rough < 0.06) fail(`planTone rough ${plan.rough} ignores residual`);

const field = createField();
const boot = currentField(field);
if (boot.i !== 0 || boot.id !== "touch") fail("field does not start on touch");

noteField(field, "tick", { residual: 0.2 });
if (field.i !== 0) fail("field advanced before a gesture");

noteField(field, "steer");
if (field.i !== 1) fail(`steer left field at ${field.i}, not 1`);

noteField(field, "kick");
if (field.i !== 2) fail(`kick left field at ${field.i}, not 2`);

for (let i = 0; i < HOLD; i++) noteField(field, "tick", { residual: 0.12 });
if (field.i !== 3) fail(`pair did not land after hold (i=${field.i})`);

for (let i = 0; i < HOLD; i++) noteField(field, "tick", { residual: 0.12 });
if (field.i !== 4) fail(`res did not land after hold (i=${field.i})`);

for (let i = 0; i < HOLD; i++) noteField(field, "tick", { residual: 0.12 });
if (field.i !== 5) fail(`mass did not land after hold (i=${field.i})`);
if (currentField(field).id !== "mass") fail("last beat is not mass");

const html = readFileSync(join(__dirname, "public", "index.html"), "utf8");
if (!html.includes("id=\"field\"")) fail("index.html missing field notes");
if (!html.includes("id=\"btn-mute\"")) fail("index.html missing mute");
if (!html.includes("id=\"hint\"")) fail("index.html missing play hint");

const css = readFileSync(join(__dirname, "public", "style.css"), "utf8");
if (!css.includes(".dock .verse") || !css.includes("pointer-events: none")) {
  fail("dock still eats the ring");
}

const main = readFileSync(join(__dirname, "public", "main.js"), "utf8");
if (!main.includes("playArm()")) fail("main.js does not arm sound on gesture");
if (!main.includes("noteField")) fail("main.js does not drive the field");
if (main.includes("armTone();") && !main.includes("playArm")) {
  fail("tone is armed outside playArm");
}

process.stdout.write(
  `play: beats=${BEATS.length} hold=${HOLD} hz0=${hz0.toFixed(1)} hzPi=${hzPi.toFixed(1)} ` +
    `end=${currentField(field).id}\n`
);
process.stdout.write("PASS\n");
