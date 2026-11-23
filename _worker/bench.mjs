// Times the live chatbot worker. Each request uses 1 of the per-IP daily message limit.
// Usage: node _worker/bench.mjs [runsPerQuestion]
const URL = "https://cold-night-c81b.pbchenchen.workers.dev/";
const QUESTIONS = ["What time is PT this week?", "Who is the Det 085 commander?"];
const runs = Number(process.argv[2] || 3);

async function once(q) {
  const t0 = performance.now();
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://d085-2.github.io" },
    body: JSON.stringify({ messages: [{ role: "user", content: q }] }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let first = null, text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const s = dec.decode(value, { stream: true });
    if (first === null && s.includes('"chunk"')) first = performance.now() - t0;
    text += s;
  }
  if (first === null) throw new Error(`no answer chunks: ${text.slice(0, 200)}`);
  return { first, total: performance.now() - t0 };
}

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
for (const q of QUESTIONS) {
  const r = [];
  for (let i = 0; i < runs; i++) r.push(await once(q));
  const f = r.map((x) => x.first), t = r.map((x) => x.total);
  console.log(`${q}\n  first word ms: ${f.map(Math.round).join(", ")}  (median ${Math.round(median(f))})\n  full answer ms: ${t.map(Math.round).join(", ")}  (median ${Math.round(median(t))})`);
}
