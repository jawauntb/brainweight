// Assay: Jev questions are typed. Local judge returns the same schema.
// The page branches on answers. No API key in the repo.
// Exit 0 and print PASS. Exit 1 on any failure.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  QUESTIONS,
  VERBS,
  packState,
  judge,
  parseAnswers,
  act,
} from "./public/jev.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function fail(msg) {
  process.stderr.write(`FAIL: ${msg}\n`);
  process.exit(1);
}

if (QUESTIONS.verb.type !== "choice") fail("verb is not a choice");
if (QUESTIONS.lock.type !== "score") fail("lock is not a score");
if (QUESTIONS.thought.type !== "noul") fail("thought is not a noul");
if (QUESTIONS.matter.type !== "choice") fail("matter is not a choice");

const lockState = packState({ residual: 0.01, corr: 0.98, score: 0.99, error: 0.05, pair: true }, { id: "steer" });
const lockAns = judge(lockState);
const lockRead = parseAnswers(lockAns);
if (!lockRead) fail("judge(lock) did not parse");
if (lockRead.verb !== "kick") fail(`lock verb is ${lockRead.verb}, not kick`);
if (lockRead.thought > 0.4) fail(`lock thought ${lockRead.thought} is too high`);
if (lockRead.lock >= 1) fail(`lock score ${lockRead.lock} is not the lock level`);

const missState = packState({ residual: 0.22, corr: 0.4, score: 0.3, error: 1.2, pair: true }, { id: "res" });
const missRead = parseAnswers(judge(missState));
if (!missRead) fail("judge(miss) did not parse");
if (missRead.thought < 0.5) fail(`miss thought ${missRead.thought} is too low`);
if (VERBS.indexOf(missRead.verb) === -1) fail("miss verb is not in VERBS");

const done = act(missRead);
if (!done.hint || done.hint.length < 8) fail("act() has no hint");
if (/human brain/i.test(done.hint) && !done.hint.includes("not a human brain")) {
  fail("hint claims a human brain");
}

const server = readFileSync(join(__dirname, "server.js"), "utf8");
if (!server.includes("app.post(\"/jev\"")) fail("server.js missing POST /jev");
if (!server.includes("JEV_URL") || !server.includes("askJev")) fail("server.js does not call Jev");
if (!server.includes("TYPESAFE_API_KEY")) fail("server.js does not read TYPESAFE_API_KEY");

const html = readFileSync(join(__dirname, "public", "index.html"), "utf8");
if (!html.includes("id=\"t-jev\"")) fail("index.html missing jev telemetry");

const ask = readFileSync(join(__dirname, "public", "ask.js"), "utf8");
if (!ask.includes("if (!clock.armed)")) fail("ask.js calls Jev before a gesture");

const repo = [
  readFileSync(join(__dirname, "server.js"), "utf8"),
  readFileSync(join(__dirname, "public", "jev.js"), "utf8"),
  readFileSync(join(__dirname, "public", "ask.js"), "utf8"),
].join("\n");
if (/sk-|[A-Za-z0-9]{32,}\.[A-Za-z0-9]{10,}/.test(repo) && repo.includes("Bearer sk")) {
  fail("a live API key looks committed");
}

process.stdout.write(
  `jev: lock=${lockRead.verb}/${lockRead.lock.toFixed(2)} ` +
    `miss=${missRead.verb}/thought=${missRead.thought.toFixed(2)} ` +
    `hint=${done.verb}\n`
);
process.stdout.write("PASS\n");
