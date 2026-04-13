// @ts-nocheck
const WORKER_URL = "https://cold-night-c81b.pbchenchen.workers.dev/";
const MAX_HISTORY_SENT = 10;
const COOLDOWN_MS = 5000;

const history = [];
let lastSendTime = 0;
let localRemaining = null;

const toggle   = document.getElementById("d085-chat-toggle");
const window_  = document.getElementById("d085-chat-window");
const closeBtn = document.getElementById("d085-close-btn");
const input    = document.getElementById("d085-chat-input");
const send     = document.getElementById("d085-chat-send");
const messages = document.getElementById("d085-chat-messages");

// Counter bar
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
  const safe = text.length > 20000 ? text.slice(0, 20000) : text;
  return safe
    .replace(/\*\*([^*]{1,500})\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]{1,200})\]\((https?:\/\/[^)\s]{1,1000})\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(?<!["\(])(https?:\/\/[^\s<]{1,1000})/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/^\s*[*-]\s+(.{1,1000})/gm, "<li>$1</li>")
    .replace(/((?:<li>.*?<\/li>\s*)+)/gs, "<ul>$1</ul>")
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
    const payload = history.slice(-MAX_HISTORY_SENT);

    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: payload }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      typing.remove();
      appendMessage("bot", data.error ?? "Sorry, something went wrong. Please try again.");
      history.pop();
      return;
    }

    // Stream the response
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullReply = "";
    let streamDiv = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (!json) continue;

        try {
          const parsed = JSON.parse(json);

          if (parsed.error) {
            typing.remove();
            appendMessage("bot", "Sorry, something went wrong. Please try again.");
            history.pop();
            return;
          }

          if (parsed.chunk) {
            // First chunk — swap typing indicator for real message
            if (!streamDiv) {
              typing.remove();
              streamDiv = appendMessage("bot", "");
            }
            fullReply += parsed.chunk;
            streamDiv.innerHTML = renderMarkdown(fullReply);
            messages.scrollTop = messages.scrollHeight;
          }

          if (parsed.done) {
            history.push({ role: "assistant", content: fullReply });
            if (parsed.remaining !== undefined) {
              if (localRemaining === null) {
                localRemaining = parsed.remaining;
              } else {
                localRemaining = Math.min(localRemaining - 1, parsed.remaining);
              }
              updateCounter(localRemaining);
            }
          }
        } catch {}
      }
    }

    // Fallback if no chunks came through
    if (!streamDiv) {
      typing.remove();
      appendMessage("bot", "Sorry, I didn't get a response.");
      history.pop();
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