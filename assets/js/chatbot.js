// @ts-nocheck
// wsup, this part is pretty confusing so I added some comments to help you understand what's going on. If you have any questions, feel free to ask!
// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Edit these values to tune behaviour without touching any logic below.

const WORKER_URL      = "https://cold-night-c81b.pbchenchen.workers.dev/";
const COOLDOWN_MS     = 5000;   // seconds a user must wait between messages (rate limiting)
const DEDUP_WINDOW_MS = 30000;  // identical message sent within this window is rejected
const MAX_INPUT_CHARS = 2000;   // characters allowed per outgoing message
const MAX_REPLY_CHARS = 20000;  // bot replies are truncated beyond this length
const MAX_HISTORY_OUT = 10;     // how many past messages are sent to the AI each request
const MAX_HISTORY_MEM = MAX_HISTORY_OUT * 2; // how many messages are kept in memory


// ─── STATE ────────────────────────────────────────────────────────────────────

const conversation   = [];   // full chat history stored in memory
let lastSentAt       = 0;    // timestamp of the last successful send
let quotaRemaining   = null; // message quota reported by the server
let lastMessageHash  = null; // SHA-256 of the last sent message (dedup)
let lastHashedAt     = 0;    // timestamp of that hash


// ─── DOM REFERENCES ───────────────────────────────────────────────────────────

const chatToggle   = document.getElementById("d085-chat-toggle");
const chatWindow   = document.getElementById("d085-chat-window");
const closeButton  = document.getElementById("d085-close-btn");
const userInput    = document.getElementById("d085-chat-input");
const sendButton   = document.getElementById("d085-chat-send");
const messageList  = document.getElementById("d085-chat-messages");


// ─── QUOTA BAR ────────────────────────────────────────────────────────────────
// A thin bar injected above the input row to show how many messages remain today.

const quotaBar = document.createElement("div");
quotaBar.id = "d085-counter-bar";
quotaBar.style.cssText = [
  "font-size:11px",
  "text-align:center",
  "padding:3px 12px 4px",
  "background:#fff",
  "color:#aaa",
  "border-top:1px solid #dde1e7",
  "display:none",
].join(";");
document.getElementById("d085-chat-input-row").before(quotaBar);

function showQuota(remaining) {
  quotaBar.style.display = "block";
  quotaBar.textContent   = `${remaining} message${remaining !== 1 ? "s" : ""} remaining today`;
  quotaBar.style.color   = remaining <= 5 ? "#e53935" : "#aaa";
}

function updateQuota(serverRemaining) {
  // Take the lower of the local count and what the server reports,
  // so the display stays accurate even if the page is open in two tabs.
  if (quotaRemaining === null) {
    quotaRemaining = serverRemaining;
  } else {
    quotaRemaining = Math.min(quotaRemaining - 1, serverRemaining);
  }
  showQuota(quotaRemaining);
}


// ─── UI EVENTS ────────────────────────────────────────────────────────────────

chatToggle.addEventListener("click", () => {
  chatWindow.classList.add("open");
  chatToggle.style.display = "none";
  userInput.focus();
});

closeButton.addEventListener("click", () => {
  chatWindow.classList.remove("open");
  chatToggle.style.display = "flex";
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendButton.addEventListener("click", sendMessage);


// ─── SECURITY HELPERS ─────────────────────────────────────────────────────────

// One regex pass over all five HTML special characters.
// Must run before any text is written to innerHTML, so a compromised server
// response cannot inject script or markup into the page.
const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, char => HTML_ESCAPES[char]);
}

// Browser-native SHA-256 via SubtleCrypto — no library needed, runs in ~1 ms.
// Used to fingerprint outgoing messages and block accidental duplicates.
async function sha256(text) {
  const bytes  = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}


// ─── MARKDOWN RENDERER ────────────────────────────────────────────────────────
// Supports: **bold**, [text](url), bare URLs, bullet lists ( - or * ), line breaks.
// Text is HTML-escaped before any substitution so no raw server tags reach the DOM.

function renderMarkdown(text) {
  const capped  = text.length > MAX_REPLY_CHARS ? text.slice(0, MAX_REPLY_CHARS) : text;
  const escaped = escapeHtml(capped);

  return escaped
    .replace(/\*\*([^*]{1,500})\*\*/g, "<strong>$1</strong>")
    // Callbacks instead of "$1" strings prevent attacker-controlled text from
    // accidentally being interpreted as a replacement pattern (e.g. "$2").
    .replace(/\[([^\]]{1,200})\]\((https?:\/\/[^)\s]{1,500})\)/g,
      (_, label, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`)
    .replace(/(?<!["\(])(https?:\/\/[^\s<]{1,500})/g,
      (_, url)        => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`)
    .replace(/^\s*[*-]\s+(.{1,500})/gm, "<li>$1</li>")
    .replace(/((?:<li>.*?<\/li>\s*)+)/gs, (_, items) => "<ul>" + items.replace(/\n/g, "") + "</ul>")
    .replace(/\n/g, "<br>");
}


// ─── MESSAGE DISPLAY ──────────────────────────────────────────────────────────

function appendMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `d085-msg ${role === "user" ? "user" : "bot"}`;

  if (role === "bot") {
    bubble.innerHTML = renderMarkdown(text); // safe: text is HTML-escaped inside renderMarkdown
  } else {
    bubble.textContent = text; // textContent never parses HTML — no XSS path for user input
  }

  messageList.appendChild(bubble);
  messageList.scrollTop = messageList.scrollHeight;
  return bubble;
}


// ─── SEND MESSAGE ─────────────────────────────────────────────────────────────

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  // --- Guards (fast, synchronous checks first) ---

  if (text.length > MAX_INPUT_CHARS) {
    appendMessage("bot", `Message too long. Please keep it under ${MAX_INPUT_CHARS} characters.`);
    return;
  }

  // Cooldown is checked before the async hash so rate-limited taps cost nothing.
  const now = Date.now();
  if (now - lastSentAt < COOLDOWN_MS) {
    const waitSecs = Math.ceil((COOLDOWN_MS - (now - lastSentAt)) / 1000);
    appendMessage("bot", `Please wait ${waitSecs} second${waitSecs !== 1 ? "s" : ""} before sending another message.`);
    return;
  }

  // Dedup: identical message within 30 s is rejected before it reaches the Worker or Gemini API.
  const hash = await sha256(text);
  if (hash === lastMessageHash && now - lastHashedAt < DEDUP_WINDOW_MS) {
    appendMessage("bot", "You already sent that message recently. Please try rephrasing.");
    return;
  }
  lastMessageHash = hash;
  lastHashedAt    = now;

  // --- Commit the send ---

  userInput.value     = "";
  sendButton.disabled = true;
  lastSentAt          = now;

  appendMessage("user", text);
  conversation.push({ role: "user", content: text });

  // Trim memory so the array never grows past MAX_HISTORY_MEM entries.
  if (conversation.length > MAX_HISTORY_MEM) {
    conversation.splice(0, conversation.length - MAX_HISTORY_MEM);
  }

  const typingBubble = appendMessage("bot", "Typing…");
  typingBubble.classList.add("typing");

  try {
    await streamReply(typingBubble);
  } catch {
    // Catches unexpected errors from the streaming loop (e.g. dropped connection mid-read).
    // Known errors (bad status, server error events) are handled inside streamReply itself.
    typingBubble.remove();
    appendMessage("bot", "Sorry, something went wrong. Please try again.");
    conversation.pop();
  } finally {
    // Always re-enable input regardless of outcome.
    sendButton.disabled = false;
    userInput.focus();
  }
}


// ─── STREAMING REPLY ──────────────────────────────────────────────────────────
// Fetches from the Cloudflare Worker and renders the SSE stream in real time.
// Heavy lifting (model call, rate limiting, quota tracking) lives on the Worker.

async function streamReply(typingBubble) {
  const payload = conversation.slice(-MAX_HISTORY_OUT);

  let response;
  try {
    response = await fetch(WORKER_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ messages: payload }),
    });
  } catch {
    typingBubble.remove();
    appendMessage("bot", "Sorry, something went wrong. Please try again.");
    conversation.pop();
    return;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    typingBubble.remove();
    appendMessage("bot", data.error ?? "Sorry, something went wrong. Please try again.");
    conversation.pop();
    return;
  }

  // --- Read the SSE stream ---

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";
  let fullReply = "";
  let replyBubble = null;

  // Render at most once per display frame (requestAnimationFrame) instead of
  // once per SSE chunk. Chunks can arrive faster than the screen refreshes, so
  // without this batching we'd trigger dozens of layout recalculations per second.
  let pendingFrame = null;
  let lastScrolled = 0;

  function scheduleRender() {
    if (pendingFrame !== null) return; // a frame is already queued
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = null;
      if (!replyBubble) return;
      replyBubble.innerHTML = renderMarkdown(fullReply);
      // Scroll to bottom, but throttle to avoid a reflow on every single frame.
      if (Date.now() - lastScrolled > 100) {
        messageList.scrollTop = messageList.scrollHeight;
        lastScrolled = Date.now();
      }
    });
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // last element may be an incomplete line — hold it

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;

      try {
        const event = JSON.parse(raw);

        if (event.error) {
          typingBubble.remove();
          appendMessage("bot", "Sorry, something went wrong. Please try again.");
          conversation.pop();
          return;
        }

        if (event.chunk) {
          if (!replyBubble) {
            typingBubble.remove();
            replyBubble = appendMessage("bot", "");
          }
          fullReply += event.chunk;
          scheduleRender();
        }

        if (event.done) {
          conversation.push({ role: "assistant", content: fullReply });
          if (event.remaining !== undefined) updateQuota(event.remaining);
        }

      } catch { /* skip malformed SSE lines */ }
    }
  }

  // Cancel any queued frame and do one final authoritative render of the
  // complete reply, so the finished message is always fully displayed.
  if (pendingFrame !== null) {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = null;
  }

  if (replyBubble) {
    replyBubble.innerHTML = renderMarkdown(fullReply);
    messageList.scrollTop = messageList.scrollHeight;
  } else {
    typingBubble.remove();
    appendMessage("bot", "Sorry, I didn't get a response.");
    conversation.pop();
  }
}


// Hello! You might be wondering where's the rest of the code! It's actually on Kwun Chen's Cloudflare Worker.
// This setup allows us to keep the client lightweight and handle all the heavy lifting on the server side.
// If you're interested in how it works or want to see the server code, feel free to ask!
