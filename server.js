const { shouldSearchWeb, searchInternet } = require("./search");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.use(session({
  secret: "pixtoon-secret-key",
  resave: false,
  saveUninitialized: false
}));

const db = new Pool({
  user: "postgres",
  host: "localhost",
  database: "nova",
  password: "Liam1Lili",
  port: 5432
});

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.json({ success: false, message: "Please log in first." });
  }
  next();
}

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  try {
    await db.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
      [email, email, hashed]
    );

    res.json({ success: true, message: "Account created! Now log in." });
  } catch {
    res.json({ success: false, message: "That email already exists." });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

  if (result.rows.length === 0) {
    return res.json({ success: false, message: "Account not found." });
  }

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return res.json({ success: false, message: "Wrong password." });
  }

  req.session.userId = user.id;
  req.session.email = user.email;

  res.json({ success: true, message: "Logged in!" });
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out." });
  });
});

app.get("/conversations", requireLogin, async (req, res) => {
  const result = await db.query(
    "SELECT id, title FROM conversations WHERE user_id = $1 ORDER BY created_at DESC",
    [req.session.userId]
  );

  res.json({ conversations: result.rows });
});

app.post("/conversations", requireLogin, async (req, res) => {
  const result = await db.query(
    "INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id, title",
    [req.session.userId, "New Chat"]
  );

  res.json({ conversation: result.rows[0] });
});

app.get("/conversations/:id/messages", requireLogin, async (req, res) => {
  const conversationId = req.params.id;

  const ownerCheck = await db.query(
    "SELECT * FROM conversations WHERE id = $1 AND user_id = $2",
    [conversationId, req.session.userId]
  );

  if (ownerCheck.rows.length === 0) {
    return res.json({ success: false, message: "Chat not found." });
  }

  const result = await db.query(
    "SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
    [conversationId]
  );

  res.json({ success: true, messages: result.rows });
});

app.delete("/conversations/:id", requireLogin, async (req, res) => {
  const conversationId = req.params.id;

  await db.query("DELETE FROM messages WHERE conversation_id = $1", [conversationId]);

  await db.query(
    "DELETE FROM conversations WHERE id = $1 AND user_id = $2",
    [conversationId, req.session.userId]
  );

  res.json({ success: true });
});

app.post("/chat", requireLogin, async (req, res) => {
  const { message, conversationId } = req.body;

  if (!conversationId) {
    return res.json({ reply: "Please create or select a chat first." });
  }

  const ownerCheck = await db.query(
    "SELECT * FROM conversations WHERE id = $1 AND user_id = $2",
    [conversationId, req.session.userId]
  );

  if (ownerCheck.rows.length === 0) {
    return res.json({ reply: "That chat does not belong to you." });
  }

  await db.query(
    "INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)",
    [conversationId, "user", message]
  );

  const oldMessages = await db.query(
    "SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 20",
    [conversationId]
  );

  const conversationText = oldMessages.rows
    .map(m => `${m.role}: ${m.content}`)
    .join("\n");

  const memoryResult = await db.query(
    "SELECT memory FROM memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
    [req.session.userId]
  );

  const memories = memoryResult.rows
    .map(row => "- " + row.memory)
    .join("\n");

  let webInfo = "No web search used.";

  try {
    if (await shouldSearchWeb(message)) {
      console.log("YES - Searching Tavily");

      const searchResult = await searchInternet(message);

      if (searchResult.foundDirectAnswer) {
        webInfo = searchResult.answer;
      } else {
        webInfo = searchResult.raw;
      }

      console.log(webInfo);
    } else {
      console.log("NO - Using Ollama only");
    }
  } catch (error) {
    console.log("Search error:", error.message);
    webInfo = "No web search used.";
  }

  let prompt;

  if (webInfo === "No web search used.") {
    prompt = `
You are Pixxy, the assistant inside Pixtoon AI.
You are friendly, helpful, simple, and conversational.

Important memories:
${memories || "No saved memories."}

Conversation:
${conversationText}

User: ${message}

Pixxy:
`;
} else {
  prompt = `
You are Pixxy.

Use the LIVE search results below to answer the user's question.

Rules:
- Never copy raw webpage text.
- Never output HTML or webpage menus.
- Never mention training data or knowledge cutoff.
- Give a short, clean answer in plain English.
- If the answer is not in the search results, say:
"I couldn't find a reliable live answer."

Question:
${message}

LIVE SEARCH RESULTS:
${webInfo}

Answer:
`;
}

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        prompt,
        stream: false
      })
    });

    const data = await response.json();
    const reply = data.response || "I don't know.";

    await db.query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)",
      [conversationId, "assistant", reply]
    );

    const memoryCheck = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        stream: false,
        prompt: `
Decide if this user message contains an important fact worth remembering long-term.

Save facts like:
- name
- favorite things
- goals
- projects
- preferences
- school/work info

Do not save:
- greetings
- random questions
- temporary stuff

User message: "${message}"

If worth remembering, reply ONLY with the memory.
If not worth remembering, reply ONLY with: NO_MEMORY
`
      })
    });

    const memoryData = await memoryCheck.json();
    const possibleMemory = memoryData.response.trim();

    if (possibleMemory !== "NO_MEMORY") {
      await db.query(
        "INSERT INTO memories (user_id, memory) VALUES ($1, $2)",
        [req.session.userId, possibleMemory]
      );
    }

    const count = await db.query(
      "SELECT COUNT(*) FROM messages WHERE conversation_id = $1",
      [conversationId]
    );

    if (Number(count.rows[0].count) <= 2) {
      const title = message.slice(0, 40);
      await db.query(
        "UPDATE conversations SET title = $1 WHERE id = $2",
        [title, conversationId]
      );
    }

    res.json({ reply });
  } catch (error) {
    console.log(error);
    res.json({ reply: "Ollama is not running." });
  }
});

app.listen(3000, () => {
  console.log("Pixtoon AI running at http://localhost:3000");
});