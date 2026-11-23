// Checks the worker's calendar parsing and search fallback. Run: node _worker/worker.test.mjs
// The worker only has a default export (what Cloudflare expects), so the test copies it
// to a temp file with the helpers exported instead of changing the deployed code.
import assert from "node:assert";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

process.env.TZ = "UTC"; // Cloudflare runs in UTC
const copy = join(tmpdir(), `worker-test-${process.pid}.mjs`);
writeFileSync(copy, readFileSync(new URL("./worker.js", import.meta.url), "utf8") + "\nexport { parseICSDate, parseICS, formatDate, relayReply };\n");
const { parseICSDate, parseICS, formatDate, relayReply } = await import(pathToFileURL(copy));
rmSync(copy);

// Pacific winter (UTC-8) and summer (UTC-7), UTC, and all-day dates.
assert.equal(parseICSDate("20261120T070000").toISOString(), "2026-11-20T15:00:00.000Z");
assert.equal(parseICSDate("20260715T070000").toISOString(), "2026-07-15T14:00:00.000Z");
assert.equal(parseICSDate("20261120T150000Z").toISOString(), "2026-11-20T15:00:00.000Z");
assert.equal(parseICSDate("20261120").toISOString(), "2026-11-20T08:00:00.000Z");
assert.equal(formatDate(parseICSDate("20261120T070000")), "Fri, Nov 20, 7:00 AM");
assert.equal(formatDate(parseICSDate("20261120"), true), "Fri, Nov 20");

// Weekly repeats: every date stays at 6:00 AM Pacific, skipped dates and moved sessions are honored.
const ics = (...events) => `BEGIN:VCALENDAR\r\n${events.map((e) => `BEGIN:VEVENT\r\n${e.join("\r\n")}\r\nEND:VEVENT\r\n`).join("")}END:VCALENDAR\r\n`;
const until = `${new Date().getUTCFullYear() + 2}0101T000000Z`;
const pt = ["UID:pt", "SUMMARY:PT", "DTSTART;TZID=America/Los_Angeles:20250101T060000", "DTEND;TZID=America/Los_Angeles:20250101T070000", `RRULE:FREQ=WEEKLY;UNTIL=${until};BYDAY=WE,FR`];
const all = parseICS(ics(pt));
assert.ok(all.length >= 8, "a weekly series expands into many dates");
all.forEach((e) => {
  assert.match(formatDate(e.start), /^(Wed|Fri), .* 6:00 AM$/);
  assert.equal(e.end - e.start, 3600000);
});
const day = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(d).replace(/-/g, "");
const [first, second] = all.map((e) => e.start);
const edited = parseICS(ics(
  [...pt, `EXDATE;TZID=America/Los_Angeles:${day(first)}T060000`],
  ["UID:pt", "SUMMARY:PT (moved)", `RECURRENCE-ID;TZID=America/Los_Angeles:${day(second)}T060000`, `DTSTART;TZID=America/Los_Angeles:${day(second)}T090000`],
));
assert.ok(!edited.some((e) => +e.start === +first), "EXDATE removes that date");
assert.ok(!edited.some((e) => e.summary === "PT" && +e.start === +second), "a moved session replaces the original date");
assert.ok(edited.some((e) => e.summary === "PT (moved)"), "the moved session is kept");
assert.equal(parseICS(ics(["UID:x", "SUMMARY:old", "DTSTART;TZID=America/Los_Angeles:20250101T060000", "RRULE:FREQ=WEEKLY;UNTIL=20250301T000000Z;BYDAY=WE"])).length, 0, "an ended series shows nothing");

// Search fallback: a fake streamed Gemini reply, split into the given pieces.
const fakeReply = (...pieces) => new Response(pieces.map((t) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] } }] })}\n\n`).join(""));
const run = async (first) => {
  let searched = 0, out = "";
  await relayReply(first, async () => { searched++; return fakeReply("Found ", "online."); }, async (t) => { out += t; });
  return { searched, out };
};
assert.deepEqual(await run(fakeReply("PT is ", "at 0700.")), { searched: 0, out: "PT is at 0700." }, "normal answers stream without searching");
assert.deepEqual(await run(fakeReply("[[SEA", "RCH]]")), { searched: 1, out: "Found online." }, "the signal, even split, triggers one search");
assert.deepEqual(await run(fakeReply(" [[SEARCH]]\n")), { searched: 1, out: "Found online." }, "spaces around the signal are fine");
assert.deepEqual(await run(fakeReply("[", "see the OPORD]")), { searched: 0, out: "[see the OPORD]" }, "text that only starts like the signal is kept");
assert.deepEqual(await run(fakeReply("[")), { searched: 0, out: "[" }, "a short reply held back is still sent");
await assert.rejects(run(new Response("quota", { status: 429 })), /Gemini error 429/);
let fallback = "";
await relayReply(fakeReply("[[SEARCH]]"), async () => new Response("no grounding on free tier", { status: 400 }), async (t) => { fallback += t; });
assert.match(fallback, /web search isn't available right now/, "a failed search tells the cadet instead of erroring");

console.log("worker tests passed");
