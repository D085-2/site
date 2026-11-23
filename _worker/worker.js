// ============================================================================
// Det 085 Chatbot — Cloudflare Worker
// Source of truth for the code deployed in the Cloudflare dashboard (paste it
// there after editing). Lives in _worker/ so Jekyll doesn't publish it.
// ============================================================================

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = new Set([
  "https://d085-2.github.io",
]);

const GEMINI_MODEL = "gemini-3.5-flash-lite"; // cheapest stable model that still does PDFs, thinking "minimal" and Google Search
const GEMINI_STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;
const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PER_USER_DAILY_LIMIT = 30;
const SEARCH_DAILY_LIMIT = 150; // 150 x 30 days stays inside Google's 5,000 free searches a month
const GLOBAL_DAILY_LIMIT = 400; // each message costs 2 KV writes; the free plan allows 1,000/day including cache refreshes
const MAX_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 2000;

const CACHE_TTL = 3600;          // site content & calendar: 1 hour
const OPORD_CACHE_TTL = 604800;  // 7 days on SUCCESS
const OPORD_FAIL_TTL = 300;      // 5 minutes on FAILURE (self-heals fast)
const OPORDS_INDEX_TTL = 604800; // 7 days for the Apps Script index lookup

const RAW_BASE = "https://raw.githubusercontent.com/D085-2/site/main";
const PAGES_TO_FETCH = [
  { path: "index.md", label: "Home" },
  { path: "chain-of-command/index.md", label: "Chain of Command" },
  { path: "calendar/index.md", label: "Calendar" },
  { path: "OPORDs/index.md", label: "OPORDs" },
  { path: "cadet-resources/index.md", label: "Cadet Resources" },
  { path: "cadet-resources/detachment-resources.md", label: "Detachment Resources" },
  { path: "staff-duties/index.md", label: "Staff Duties" },
  { path: "flag-duty/index.md", label: "Flag Duty" },
  { path: "extracurriculars/index.md", label: "Extracurriculars" },
  { path: "extracurriculars/arnold-air-society.md", label: "Arnold Air Society" },
  { path: "extracurriculars/color-honor-guard.md", label: "Color & Honor Guard" },
  { path: "extracurriculars/faith-force.md", label: "Faith Force" },
  { path: "extracurriculars/spec-ops.md", label: "Spec Ops" },
];

const CALENDAR_ID = "c_03b061bc3f178e6739adbc98a970660b53f1319878f602c92649bacfef737ee5@group.calendar.google.com"; // same calendar embedded on calendar/index.md
const TZ = "America/Los_Angeles";
const ICAL_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;

const DRIVE_FOLDER_IDS = {
  SPT: "1eE71CVFnl-2pe-Q04vJnNEHvwHuZRk-r",
  LLAB: "14fdc2qNvM17RsbF73LUUXgR2c1usnXOC",
};

const SEARCH_SIGNAL = "[[SEARCH]]"; // the model replies with only this when the provided content lacks the answer
const SEARCH_MODE_NOTE = `

SEARCH MODE: The content above did not answer the latest question, so Google Search is now available. Use it, prefer official Air Force and AFROTC sources, and never reply with ${SEARCH_SIGNAL}. If the question is about this detachment specifically (its dates, times, people or places) and search doesn't answer it, say so and suggest asking cadre.`;

const KV_KEYS = {
  rateLimitGlobal: (day) => `ratelimit:global:${day}`,
  searchCount: (day) => `ratelimit:search:${day}`,
  rateLimitUser: (ip, day) => `ratelimit:user:${ip}:${day}`,
  siteContent: "cache:site-content",
  calendar: "cache:calendar",
  opordsIndex: "cache:opords:index",
  opord: (label, fileId) => `cache:opords:${label.toLowerCase()}:${fileId}`,
};

const STATIC_SYSTEM_PROMPT = `You are the official AI assistant for AFROTC Detachment 085. You help cadets with information about the detachment, its schedule, and general AFROTC knowledge.

CHAIN OF COMMAND / LEADERSHIP:
Det 085 Commander: Lieutenant Colonel Donovan Matteson
Det 085 Cadet Wing Commander: Cadet Colonel Marisa Rush
Wing Commander: C/Col Rush, M.
Vice Wing Commander: C/Col Jansen, L.
Inspector General: TBD
Staff/Flight sections: (TBD, UNDER CHANGES FOR FA26)

RESPONSE STYLE — FOLLOW STRICTLY:
Keep answers concise and professional — 3 sentences or fewer for simple questions, longer only when the question genuinely requires detail (e.g. summarizing an OPORD).
Write in plain prose sentences only — never use bullet points, numbered lists, dashes, or any list formatting of any kind, even if the source material (like an OPORD) is itself formatted as a list. Convert any list-shaped source content into flowing sentences.
Do not use filler phrases like "I hope this helps" or "Great question." Get straight to the answer.
If you don't know something, say so plainly instead of guessing.
If the content below does not answer the cadet's question, reply with exactly [[SEARCH]] and nothing else; the question is then answered again with Google Search. Do not use [[SEARCH]] for greetings, small talk or questions about you.
For questions about ODTs (Officer Development Training opportunities such as summer internships, research programs or flight academies), do not answer from memory; direct the cadet to the ODT page at https://d085-2.github.io/site/odts/ and suggest they ask cadre.

You will be given the current website content, upcoming calendar events, and the latest LLAB and SPT (Physical Training) OPORDs below. Use them as your source of truth for anything time-sensitive. If an OPORD says it "could not be loaded," tell the user that directly rather than guessing at PT/LLAB details from memory.`;

let cachedApiKey = null;
let cachedAccessToken = null;
let accessTokenExpiry = 0;

// ---------------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------------
function todayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ }); // Pacific day, so limits reset at midnight
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function requireSecret(provided, env) {
  if (provided !== env.CACHE_CLEAR_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }
  return null;
}

function base64UrlEncode(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64Chunked(buffer) {
  const uint8 = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// ---------------------------------------------------------------------------
// GOOGLE AUTH (service account JWT -> OAuth access token)
// ---------------------------------------------------------------------------
async function getGoogleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && now < accessTokenExpiry - 60) {
    return cachedAccessToken;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: env.GOOGLE_SERVICE_ACCOUNT,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claimSet))}`;

  const keyBuffer = pemToArrayBuffer(env.GOOGLE_PRIVATE_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );
  const jwt = `${unsigned}.${base64UrlEncode(signature)}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth token error: ${tokenRes.status} ${errText}`);
  }

  const tokenData = await tokenRes.json();
  cachedAccessToken = tokenData.access_token;
  accessTokenExpiry = now + (tokenData.expires_in || 3600);
  return cachedAccessToken;
}

async function registerDriveWatch(label, folderId, env, webhookUrl) {
  const accessToken = await getGoogleAccessToken(env);
  const channelId = `det085-${label.toLowerCase()}-${Date.now()}`;

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}/watch?supportsAllDrives=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
        token: env.CACHE_CLEAR_SECRET,
        payload: true,
        expiration: Date.now() + 86400000, // Drive's max for files.watch is 1 day; the default is only 1 hour
      }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.log(`[watch:${label}] renewal failed: ${res.status} ${JSON.stringify(data)}`);
    throw new Error(`Watch renewal failed for ${label}: ${res.status} ${JSON.stringify(data)}`);
  }
  console.log(`[watch:${label}] renewed, expires ${data.expiration}`);
  return data;
}

// ---------------------------------------------------------------------------
// CALENDAR
// ---------------------------------------------------------------------------
function unfoldICS(raw) {
  return raw.replace(/\r\n[ \t]/g, "").split(/\r\n|\n/);
}

// Pacific wall-clock time -> Date. Workers run in UTC, so the offset (PST/PDT) has to be looked up.
function pacificDate(y, m, d, hh, mm, ss) {
  const utc = Date.UTC(y, m - 1, d, hh, mm, ss);
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "shortOffset" })
    .formatToParts(new Date(utc)).find((p) => p.type === "timeZoneName").value; // e.g. "GMT-8"
  return new Date(utc - Number(name.replace("GMT", "") || 0) * 3600000);
}

// addDays shifts the wall-clock date, so a repeating 7:00 AM stays 7:00 AM across PST/PDT changes.
function parseICSDate(value, addDays = 0) {
  if (!value) return null;
  const c = value.replace(/[^0-9TZ]/g, "");
  const [y, m, d, hh, mm, ss] = [c.slice(0, 4), c.slice(4, 6), c.slice(6, 8), c.slice(9, 11), c.slice(11, 13), c.slice(13, 15)].map((s) => Number(s) || 0);
  if (c.endsWith("Z")) return new Date(Date.UTC(y, m - 1, d + addDays, hh, mm, ss));
  // shortcut: treats every TZID time and all-day date as Pacific (true for this feed); read the TZID if other zones appear.
  return pacificDate(y, m, d + addDays, hh, mm, ss);
}

const WEEKDAY = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const dayCode = (date) => WEEKDAY.format(date).slice(0, 2).toUpperCase(); // "MO", "TU", ...

// Turns one repeating event (RRULE) into its dates up to `horizon`, minus EXDATEs and moved instances.
// shortcut: only FREQ=WEEKLY with BYDAY/UNTIL (all this feed uses); INTERVAL, COUNT and other FREQs show the first date only.
function expandWeekly(e, moved, horizon) {
  const rule = Object.fromEntries(e.rrule.split(";").map((p) => p.split("=")));
  if (rule.FREQ !== "WEEKLY" || rule.INTERVAL || rule.COUNT) return [e];
  const days = (rule.BYDAY || dayCode(e.start)).split(",");
  const until = rule.UNTIL ? parseICSDate(rule.UNTIL) : horizon;
  const stop = until < horizon ? until : horizon;
  const length = e.end ? e.end - e.start : 0;
  const out = [];
  for (let k = 0; ; k++) {
    const start = parseICSDate(e.startRaw, k);
    if (start > stop) break;
    if (!days.includes(dayCode(start)) || e.exdates.includes(+start) || moved.has(`${e.uid}|${+start}`)) continue;
    out.push({ ...e, start, end: length ? new Date(+start + length) : null });
  }
  return out;
}

function cleanICalText(text) {
  return (text || "")
    .replace(/\\n/g, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .trim();
}

function formatDate(date, allDay) {
  if (!date) return "TBD";
  return date.toLocaleString("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(allDay ? {} : { hour: "numeric", minute: "2-digit" }),
  });
}

function parseICS(raw) {
  const lines = unfoldICS(raw);
  const events = [];
  /** @type {any} */ // fields (uid, start, rrule, ...) are filled in line by line
  let current = null;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = { exdates: [] };
    } else if (line.startsWith("END:VEVENT")) {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      const value = line.slice(line.indexOf(":") + 1);
      if (line.startsWith("SUMMARY:")) current.summary = cleanICalText(line.slice(8));
      else if (line.startsWith("DTSTART")) {
        current.startRaw = value;
        current.start = parseICSDate(value);
        current.allDay = line.startsWith("DTSTART;VALUE=DATE");
      }
      else if (line.startsWith("DTEND")) current.end = parseICSDate(value);
      else if (line.startsWith("LOCATION:")) current.location = cleanICalText(line.slice(9));
      else if (line.startsWith("UID:")) current.uid = value;
      else if (line.startsWith("RRULE:")) current.rrule = value;
      else if (line.startsWith("EXDATE")) current.exdates.push(...value.split(",").map((v) => +parseICSDate(v)));
      else if (line.startsWith("RECURRENCE-ID")) current.recurrenceId = +parseICSDate(value);
    }
  }

  const now = new Date();
  const horizon = new Date(+now + 60 * 86400000); // only expand repeats 60 days ahead
  // A moved/edited single instance is its own VEVENT with RECURRENCE-ID; it replaces that date of the series.
  const moved = new Set(events.filter((e) => e.recurrenceId).map((e) => `${e.uid}|${e.recurrenceId}`));
  return events
    .flatMap((e) => (e.rrule && e.start ? expandWeekly(e, moved, horizon) : [e]))
    .filter((e) => e.start && (e.end || e.start) >= now) // keep today's all-day and in-progress events
    .sort((a, b) => a.start - b.start)
    .slice(0, 30); // about 3 weeks of PT, LLAB and classes
}

async function fetchCalendarEvents(kv) {
  const cached = await kv.get(KV_KEYS.calendar);
  if (cached) return cached;

  try {
    const res = await fetch(ICAL_URL);
    if (!res.ok) throw new Error(`iCal fetch error: ${res.status}`);
    const raw = await res.text();
    const events = parseICS(raw);

    const formatted = events.length
      ? events
          .map((e) => `- ${e.summary} — ${formatDate(e.start, e.allDay)}${e.location ? ` @ ${e.location}` : ""}`)
          .join("\n")
      : "No upcoming events found.";

    await kv.put(KV_KEYS.calendar, formatted, { expirationTtl: CACHE_TTL });
    return formatted;
  } catch (e) {
    return `Calendar could not be loaded: ${e.message}`;
  }
}

// ---------------------------------------------------------------------------
// SITE CONTENT
// ---------------------------------------------------------------------------
function stripFrontmatter(text) {
  return text.replace(/^---[\s\S]*?---\s*/m, "");
}

function stripHtml(text) {
  return text.replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchSiteContent(kv) {
  const cached = await kv.get(KV_KEYS.siteContent);
  if (cached) return cached;

  try {
    const results = await Promise.all(
      PAGES_TO_FETCH.map(async ({ path, label }) => {
        try {
          const res = await fetch(`${RAW_BASE}/${path}`);
          if (!res.ok) {
            console.log(`[site] ${path} returned ${res.status}`); // a missing page used to vanish silently
            return "";
          }
          const raw = await res.text();
          const clean = stripHtml(stripFrontmatter(raw)).slice(0, 4000);
          return `=== ${label} ===\n${clean}`;
        } catch {
          return "";
        }
      })
    );

    const combined = results.filter(Boolean).join("\n\n");
    await kv.put(KV_KEYS.siteContent, combined, { expirationTtl: CACHE_TTL });
    return combined;
  } catch (e) {
    return `Site content could not be loaded: ${e.message}`;
  }
}

// ---------------------------------------------------------------------------
// OPORDS
// ---------------------------------------------------------------------------
async function fetchOpordsIndex(kv, appsScriptUrl) {
  const cached = await kv.get(KV_KEYS.opordsIndex);
  if (cached) {
    return JSON.parse(cached);
  }

  const res = await fetch(appsScriptUrl, { redirect: "follow" });
  if (!res.ok) throw new Error(`Apps Script index fetch error: ${res.status}`);
  const data = await res.json();

  await kv.put(KV_KEYS.opordsIndex, JSON.stringify(data), { expirationTtl: OPORDS_INDEX_TTL });
  return data;
}

async function fetchLatestOpord(label, fileId, fileName, kv) {
  const cacheKey = KV_KEYS.opord(label, fileId);
  const cached = await kv.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const pdfUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;

    const pdfRes = await fetch(pdfUrl, { redirect: "follow" });
    const contentType = pdfRes.headers.get("content-type") || "";

    if (!pdfRes.ok) throw new Error(`PDF download error: ${pdfRes.status}`);
    if (contentType.includes("text/html")) {
      throw new Error("Got HTML instead of PDF — file may require login or virus-scan confirmation");
    }

    const pdfBuffer = await pdfRes.arrayBuffer();

    if (pdfBuffer.byteLength < 500) {
      // A real OPORD PDF should never be this small — this usually means we
      // downloaded an HTML confirmation/interstitial page whose content-type
      // header lied (Google sometimes serves these as application/octet-stream).
      throw new Error(`Downloaded file suspiciously small (${pdfBuffer.byteLength} bytes) — likely not the real PDF`);
    }

    const base64Pdf = bufferToBase64Chunked(pdfBuffer);

    const geminiExtractUrl = `${GEMINI_GENERATE_URL}?key=${cachedApiKey}`;
    const extractRes = await fetch(geminiExtractUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { inline_data: { mime_type: "application/pdf", data: base64Pdf } },
              { text: "Extract all text from this OPORD. Preserve structure, headings, times, and tasks. Output plain text only." },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 8192, thinkingConfig: { thinkingLevel: "minimal" } },
      }),
    });

    if (!extractRes.ok) {
      const errBody = await extractRes.text().catch(() => "");
      throw new Error(`Gemini extract error: ${extractRes.status}`);
    }

    const extractData = await extractRes.json();
    const text = extractData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text) throw new Error("No text extracted from PDF (empty candidate response)");

    const result = `=== LATEST ${label} OPORD: ${fileName} ===\n${text}`;
    await kv.put(cacheKey, result, { expirationTtl: OPORD_CACHE_TTL });
    return result;
  } catch (e) {
    const failResult = `${label} OPORD could not be loaded: ${e.message}`;
    await kv.put(cacheKey, failResult, { expirationTtl: OPORD_FAIL_TTL });
    return failResult;
  }
}

// Fetches/extracts every file in `files` for this label and joins the
// results. Each file is still cached individually by its own fileId (see
// KV_KEYS.opord), so a folder with multiple PT-day OPORDs (e.g. Wednesday +
// Friday) returns ALL of them instead of just whichever was uploaded last.
async function fetchOpordGroup(label, files, kv) {
  if (!Array.isArray(files) || files.length === 0) {
    return `${label} OPORD could not be loaded: no files found in the Drive folder.`;
  }

  const results = await Promise.all(
    files.map((f) => fetchLatestOpord(label, f.id, f.name, kv))
  );
  return results.join("\n\n");
}

async function fetchOpords(kv, appsScriptUrl) {
  let index;
  try {
    index = await fetchOpordsIndex(kv, appsScriptUrl);
  } catch (e) {
    return `OPORDs could not be loaded: ${e.message}`;
  }

  // Index returns an ARRAY of {id, name, modified} per label — a folder can
  // hold more than one current OPORD (e.g. separate Wednesday/Friday PT
  // files). Always fetch every file for both labels; fetchLatestOpord's own
  // per-file KV cache means an already-warm file costs just one KV read.
  const sptFiles = Array.isArray(index?.SPT) ? index.SPT : [];
  const llabFiles = Array.isArray(index?.LLAB) ? index.LLAB : [];

  const [sptResult, llabResult] = await Promise.all([
    fetchOpordGroup("SPT", sptFiles, kv),
    fetchOpordGroup("LLAB", llabFiles, kv),
  ]);

  return `${sptResult}\n\n${llabResult}`;
}

async function rewarmAllCaches(env) {
  const kv = env.RATE_LIMIT_KV;
  await kv.delete(KV_KEYS.opordsIndex);
  await kv.delete(KV_KEYS.siteContent);
  await kv.delete(KV_KEYS.calendar);

  const index = await fetchOpordsIndex(kv, env.APPS_SCRIPT_URL).catch((e) => {
    console.log(`[rewarm] index fetch failed: ${e.message}`);
    return null;
  });
  await Promise.all(["SPT", "LLAB"].flatMap((label) =>
    (Array.isArray(index?.[label]) ? index[label] : []).map((f) => kv.delete(KV_KEYS.opord(label, f.id)))));

  await Promise.all([fetchSiteContent(kv), fetchCalendarEvents(kv), fetchOpords(kv, env.APPS_SCRIPT_URL)]);

  console.log(`[rewarm] done`);
}

// ---------------------------------------------------------------------------
// GEMINI STREAMING
// ---------------------------------------------------------------------------
// Yields the text pieces of a streamed Gemini reply (server-sent events). A search-grounded reply
// also carries Google's "Search Suggestions" HTML, which is passed once to `onSuggestions`.
async function* geminiTexts(res, onSuggestions) {
  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 500)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let suggestionsSent = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        let parsed;
        try { parsed = JSON.parse(line.slice(6)); } catch { continue; } // ignore malformed SSE lines
        const text = (parsed?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
        if (text) yield text;
        const html = parsed?.candidates?.[0]?.groundingMetadata?.searchEntryPoint?.renderedContent;
        if (html && onSuggestions && !suggestionsSent) { suggestionsSent = true; await onSuggestions(html); }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

// Sends the reply to `send` as it streams. If the model answers only SEARCH_SIGNAL, that reply is
// dropped and `searchAgain()` (the same question with Google Search) is streamed instead, so
// questions the site already answers never wait on a search. Google's terms require showing the
// search's Search Suggestions with a grounded answer; they go to `sendSuggestions`.
async function relayReply(res, searchAgain, send, sendSuggestions) {
  let held = searchAgain ? "" : null; // text held back while it could still be the signal
  for await (const chunk of geminiTexts(res, sendSuggestions)) {
    if (held === null) { await send(chunk); continue; }
    held += chunk;
    const start = held.trimStart();
    if (start.startsWith(SEARCH_SIGNAL)) {
      try {
        return await relayReply(await searchAgain(), null, send, sendSuggestions);
      } catch (e) {
        // e.g. search quota used up, or a free-tier key (Google Search isn't available there)
        console.log(`[chat] search failed: ${e.message}`);
        return send("I couldn't find that in the detachment's information, and web search isn't available right now. Please ask cadre.");
      }
    }
    if (!SEARCH_SIGNAL.startsWith(start)) { await send(held); held = null; }
  }
  if (held) await send(held);
}

// ---------------------------------------------------------------------------
// REQUEST HANDLERS
// ---------------------------------------------------------------------------
export default {
  async scheduled(event, env, ctx) {
    cachedApiKey = env.GEMINI_API_KEY;
    if (event.cron === "*/5 * * * *") return; // old keep-warm timer; ignore it if it's still set in the dashboard

    // Daily heavy job: renew Drive watches (they expire after at most 1 day),
    // then rewarm every cache.
    const webhookUrl = `${env.WORKER_BASE_URL}/drive-webhook`;
    try {
      await registerDriveWatch("SPT", DRIVE_FOLDER_IDS.SPT, env, webhookUrl);
      await registerDriveWatch("LLAB", DRIVE_FOLDER_IDS.LLAB, env, webhookUrl);
    } catch (e) {
      console.log(`[scheduled] watch renewal failed: ${e.message}`);
    }

    await rewarmAllCaches(env);
  },

  async fetch(request, env, ctx) {
    cachedApiKey = env.GEMINI_API_KEY;
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    // --- Drive push-notification webhook ---
    if (url.pathname === "/drive-webhook" && request.method === "POST") {
      const token = request.headers.get("X-Goog-Channel-Token");
      const denied = requireSecret(token, env);
      if (denied) return denied;

      const state = request.headers.get("X-Goog-Resource-State");
      console.log(`[webhook] resource-state=${state}`);
      if (state !== "sync") {
        await env.RATE_LIMIT_KV.delete(KV_KEYS.opordsIndex);
        console.log(`[webhook] invalidated opordsIndex cache`);
        // Extract any new OPORD now so no cadet's message waits on the PDF + Gemini extraction.
        // Already-cached files are just a KV read, so repeated Drive notifications stay cheap.
        ctx.waitUntil(fetchOpords(env.RATE_LIMIT_KV, env.APPS_SCRIPT_URL));
      }
      return new Response("OK", { status: 200 });
    }

    // --- Manual watch setup/renewal ---
    if (url.pathname === "/setup-watch" && request.method === "GET") {
      const denied = requireSecret(request.headers.get("X-Secret"), env);
      if (denied) return denied;

      const webhookUrl = `${env.WORKER_BASE_URL}/drive-webhook`;
      try {
        const [spt, llab] = await Promise.all([
          registerDriveWatch("SPT", DRIVE_FOLDER_IDS.SPT, env, webhookUrl),
          registerDriveWatch("LLAB", DRIVE_FOLDER_IDS.LLAB, env, webhookUrl),
        ]);
        return new Response(JSON.stringify({ spt, llab }, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // --- Manual cache clear/rewarm ---
    if (url.pathname === "/clear-cache" && request.method === "GET") {
      const denied = requireSecret(request.headers.get("X-Secret"), env);
      if (denied) return denied;

      await rewarmAllCaches(env);
      return new Response("Caches cleared and rewarmed.", { status: 200 });
    }

    // --- CORS preflight for the main chat endpoint ---
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders(origin) });
    }

    if (!ALLOWED_ORIGINS.has(origin)) {
      return new Response(JSON.stringify({ error: "Origin not allowed." }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const messages = Array.isArray(body?.messages) ? body.messages : null;
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing messages." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }
    if (messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: "Too many messages in history." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }
    for (const m of messages) {
      if (typeof m?.content !== "string" || m.content.length > MAX_MESSAGE_LENGTH) {
        return new Response(JSON.stringify({ error: "Invalid message content." }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
    }

    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const day = todayKey();
    const kv = env.RATE_LIMIT_KV;
    const userKey = KV_KEYS.rateLimitUser(ip, day);
    const globalKey = KV_KEYS.rateLimitGlobal(day);

    // Cheap rate-limit reads FIRST, before any expensive fetch.
    const [userCountStr, globalCountStr] = await Promise.all([kv.get(userKey), kv.get(globalKey)]);
    const userCount = parseInt(userCountStr || "0", 10);
    const globalCount = parseInt(globalCountStr || "0", 10);

    if (userCount >= PER_USER_DAILY_LIMIT) {
      return new Response(JSON.stringify({ error: "You've hit today's message limit. Try again tomorrow." }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }
    if (globalCount >= GLOBAL_DAILY_LIMIT) {
      return new Response(JSON.stringify({ error: "The chatbot has hit its daily usage cap. Try again tomorrow." }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    // Count the request BEFORE calling Gemini. A failed request still counts: rolling back raced with other in-flight messages.
    const newUserCount = userCount + 1;
    const newGlobalCount = globalCount + 1;
    await Promise.all([
      kv.put(userKey, String(newUserCount), { expirationTtl: 86400 }),
      kv.put(globalKey, String(newGlobalCount), { expirationTtl: 86400 }),
    ]);

    let siteContent, calendarEvents, opords;
    try {
      [siteContent, calendarEvents, opords] = await Promise.all([
        fetchSiteContent(kv),
        fetchCalendarEvents(kv),
        fetchOpords(kv, env.APPS_SCRIPT_URL),
      ]);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to gather context. Please try again." }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const fullSystemPrompt = `${STATIC_SYSTEM_PROMPT}

=== CURRENT WEBSITE CONTENT ===
${siteContent}

=== UPCOMING CALENDAR EVENTS ===
${calendarEvents}

=== CURRENT OPORDS ===
${opords}`;

    // No google_search tool on the first call: grounding added a search round-trip before the first token
    // on every message. Search only runs when the model asks for it (see relayReply).
    const geminiPayload = {
      system_instruction: { parts: [{ text: fullSystemPrompt }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        // no temperature: 3.5 Flash-Lite and newer ignore it and Google says future models will reject it
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingLevel: "minimal" },
      },
    };

    let geminiRes;
    try {
      geminiRes = await fetch(`${GEMINI_STREAM_URL}&key=${cachedApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to reach Gemini. Please try again." }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    if (!geminiRes.ok || !geminiRes.body) {
      const errText = await geminiRes.text().catch(() => "");
      console.log(`[chat] Gemini error ${geminiRes.status}: ${errText.slice(0, 500)}`);
      return new Response(JSON.stringify({ error: "Gemini returned an error. Please try again." }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const remainingUser = PER_USER_DAILY_LIMIT - newUserCount;

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const searchAgain = async () => {
      const searchKey = KV_KEYS.searchCount(day);
      const used = parseInt((await kv.get(searchKey)) || "0", 10);
      if (used >= SEARCH_DAILY_LIMIT) throw new Error("daily search cap reached");
      await kv.put(searchKey, String(used + 1), { expirationTtl: 86400 });
      return fetch(`${GEMINI_STREAM_URL}&key=${cachedApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...geminiPayload,
          system_instruction: { parts: [{ text: fullSystemPrompt + SEARCH_MODE_NOTE }] },
          tools: [{ google_search: {} }],
        }),
      });
    };

    const pump = async () => {
      const send = (chunk) => writer.write(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
      const sendSuggestions = (html) => writer.write(encoder.encode(`data: ${JSON.stringify({ suggestions: html })}\n\n`));
      try {
        await relayReply(geminiRes, searchAgain, send, sendSuggestions);
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ done: true, remaining: remainingUser })}\n\n`)
        );
      } catch (e) {
        console.log(`[chat] stream pump error: ${e.message}`);
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: true })}\n\n`));
      } finally {
        await writer.close();
      }
    };

    ctx.waitUntil(pump());

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        ...corsHeaders(origin),
      },
    });
  },
};
