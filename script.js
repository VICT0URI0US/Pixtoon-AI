let currentConversationId = null;
let controller = null;
let generating = false;

async function signup() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const res = await fetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  document.getElementById("status").textContent = data.message;
}

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  document.getElementById("status").textContent = data.message;

  if (data.success) {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("app").style.display = "flex";
    await loadConversations();
  }
}

async function logout() {
  await fetch("/logout", { method: "POST", credentials: "include" });
  location.reload();
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("hidden");
}

async function loadConversations() {
  const res = await fetch("/conversations", { credentials: "include" });
  const data = await res.json();
  const list = document.getElementById("conversationList");

  list.innerHTML = "";

  data.conversations.forEach(chat => {
    const div = document.createElement("div");
    div.className = "chatItem";

    const title = document.createElement("span");
    title.textContent = chat.title;

    const x = document.createElement("button");
    x.textContent = "×";
    x.className = "deleteChat";
    x.onclick = async (e) => {
      e.stopPropagation();

      await fetch(`/conversations/${chat.id}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (currentConversationId === chat.id) {
        currentConversationId = null;
        document.getElementById("chat").innerHTML =
          `<div class="empty">Create a new chat or choose one from the sidebar.</div>`;
      }

      await loadConversations();
    };

    div.onclick = () => openConversation(chat.id, div);
    div.appendChild(title);
    div.appendChild(x);
    list.appendChild(div);
  });
}

async function createConversation() {
  const res = await fetch("/conversations", {
    method: "POST",
    credentials: "include"
  });

  const data = await res.json();
  if (!data.conversation) return;

  currentConversationId = data.conversation.id;
  await loadConversations();
  await openConversation(currentConversationId);
}

async function openConversation(id) {
  currentConversationId = id;
  await loadConversations();

  const res = await fetch(`/conversations/${id}/messages`, {
    credentials: "include"
  });

  const data = await res.json();
  const chat = document.getElementById("chat");
  chat.innerHTML = "";

  if (!data.messages || data.messages.length === 0) {
    chat.innerHTML = `<div class="empty">New chat started. Say hi to Pixxy.</div>`;
    return;
  }

  data.messages.forEach(msg => {
    const cls = msg.role === "user" ? "user" : "bot";
    const name = msg.role === "user" ? "You" : "Pixxy";
    chat.innerHTML += `<div class="msg ${cls}"><b>${name}:</b><br>${escapeHtml(msg.content)}</div>`;
  });

  chat.scrollTop = chat.scrollHeight;
}

function handleSend() {
  if (generating && controller) {
    controller.abort();

    generating = false;
    controller = null;

    document.getElementById("sendButton").textContent = "Send";
    document.getElementById("thinking")?.remove();

    return;
  }

  send();
}

async function send() {
  const input = document.getElementById("message");
  const chat = document.getElementById("chat");
  const text = input.value.trim();

  if (!text) return;

  if (!currentConversationId) {
    await createConversation();
  }

  chat.querySelector(".empty")?.remove();

  // Your message (NO "You:")
  chat.innerHTML += `
    <div class="msg user">
      ${escapeHtml(text)}
    </div>
  `;

  input.value = "";

  chat.innerHTML += `
    <div class="msg bot" id="thinking">
      <b>Pixxy:</b><br>
      Pixxy is thinking...
    </div>
  `;

  chat.scrollTop = chat.scrollHeight;

  controller = new AbortController();
  generating = true;

  const sendBtn = document.getElementById("sendButton");
  sendBtn.textContent = "Stop";

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: controller.signal,
      body: JSON.stringify({
        message: text,
        conversationId: currentConversationId
      })
    });

    const data = await res.json();

    document.getElementById("thinking")?.remove();

    const botDiv = document.createElement("div");
    botDiv.className = "msg bot";
    botDiv.innerHTML = "<b>Pixxy:</b><br>";

    chat.appendChild(botDiv);

    const words = data.reply.split(" ");

    for (const word of words) {
      botDiv.innerHTML += escapeHtml(word) + " ";
      chat.scrollTop = chat.scrollHeight;
      await new Promise(resolve => setTimeout(resolve, 25));
    }

    await loadConversations();
    chat.scrollTop = chat.scrollHeight;

  } catch (err) {
    document.getElementById("thinking")?.remove();

    if (err.name !== "AbortError") {
      chat.innerHTML += `
        <div class="msg bot">
          <b>Pixxy:</b><br>
          Something went wrong.
        </div>
      `;
    }
  }

  generating = false;
  controller = null;
  sendBtn.textContent = "Send";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

document.getElementById("message").addEventListener("keydown", function(e) {
  if (e.key === "Enter") send();
});
