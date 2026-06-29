const db = require("./database");

async function getMemories(userId) {
  const result = await db.query(
    "SELECT memory FROM memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
    [userId]
  );

  return result.rows.map(row => row.memory);
}

async function saveMemory(userId, memory) {
  await db.query(
    "INSERT INTO memories (user_id, memory) VALUES ($1, $2)",
    [userId, memory]
  );
}

module.exports = {
  getMemories,
  saveMemory
};