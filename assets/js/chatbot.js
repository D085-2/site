const WORKER_URL = "https://cold-night-c81b.pbchenchen.workers.dev/";
const MAX_HISTORY_SENT = 10;   // last N messages sent to the API
const COOLDOWN_MS = 5000;      // ms between sends

const history = [];
let lastSendTime = 0;
let localRemaining = null;

const toggle   = document.getElementById("d085-chat-toggle");
const window_  = document.getElementById("d085-chat-window");
const closeBtn = document.getElementById("d085-close-btn");
const input    = document.getElementById("d085-chat-input");
const send     = document.getElementById("d085-chat-send");
const messages = document.getElementById("d085-chat-messages");

// Inject counter bar above the input row
const counterBar = document.createElement("div");
counterBar.id = "d085-counter-bar";
counterBar.style.cssText = [
  "font-size:11px",
  "text-align:center",
  "padding:3px 12px 4px",
  "background:#fff",
  "color:#aaa",
  "border-top:1px solid #dde1e7",
  "display:none",
].join(";");
document.getElementById("d085-chat-input-row").before(counterBar);

function updateCounter(remaining) {
  counterBar.style.display = "block";
  counterBar.textContent = `${remaining} message${remaining !== 1 ? "s" : ""} remaining today`;
  counterBar.style.color = remaining <= 5 ? "#e53935" : "#aaa";
}

toggle.addEventListener("click", () => {
  window_.classList.add("open");
  toggle.style.display = "none";
  input.focus();
});

closeBtn.addEventListener("click", () => {
  window_.classList.remove("open");
  toggle.style.display = "flex";
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

send.addEventListener("click", sendMessage);

function renderMarkdown(text) {
  // Truncate pathologically long input to prevent ReDoS
  const safe = text.length > 20000 ? text.slice(0, 20000) : text;
  return safe
    // Bold — use negated char class instead of lazy .*?
    .replace(/\*\*([^*]{1,500})\*\*/g, "<strong>$1</strong>")
    // Links — cap label and URL length
    .replace(/\[([^\]]{1,200})\]\((https?:\/\/[^)\s]{1,1000})\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Bare URLs — [^\s<] is already non-backtracking, cap length
    .replace(/(?<!["\(])(https?:\/\/[^\s<]{1,1000})/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    // Bullet points
    .replace(/^\s*[*-]\s+(.{1,1000})/gm, "<li>$1</li>")
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]{1,10000}<\/li>)/g, "<ul>$1</ul>")
    // Line breaks
    .replace(/\n/g, "<br>");
}

function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = "d085-msg " + (role === "user" ? "user" : "bot");
  if (role === "bot") {
    div.innerHTML = renderMarkdown(text);
  } else {
    div.textContent = text;
  }
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  // Cooldown check
  const now = Date.now();
  if (now - lastSendTime < COOLDOWN_MS) {
    const secs = Math.ceil((COOLDOWN_MS - (now - lastSendTime)) / 1000);
    appendMessage("bot", `Please wait ${secs} second${secs !== 1 ? "s" : ""} before sending another message.`);
    return;
  }

  input.value = "";
  send.disabled = true;
  lastSendTime = now;

  appendMessage("user", text);
  history.push({ role: "user", content: text });

  const typing = appendMessage("bot", "Typing…");
  typing.classList.add("typing");

  try {
    // Only send last MAX_HISTORY_SENT messages to keep token usage low
    const payload = history.slice(-MAX_HISTORY_SENT);

    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: payload }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Show the actual error message from the worker (rate limit, etc.)
      typing.remove();
      appendMessage("bot", data.error ?? "Sorry, something went wrong. Please try again.");
      history.pop();
      return;
    }

    const reply = data.reply ?? "Sorry, I didn't get a response.";
    typing.remove();
    appendMessage("bot", reply);
    history.push({ role: "assistant", content: reply });

    if (data.remaining !== undefined) {
      if (localRemaining === null) {
        localRemaining = data.remaining;
      } else {
        // Always decrement locally; clamp down if server says fewer remaining
        localRemaining = Math.min(localRemaining - 1, data.remaining);
      }
      updateCounter(localRemaining);
    }
  } catch (err) {
    typing.remove();
    appendMessage("bot", "Sorry, something went wrong. Please try again.");
    history.pop();
  } finally {
    send.disabled = false;
    input.focus();
  }
}
