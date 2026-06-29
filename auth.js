const bcrypt = require("bcrypt");
const db = require("./database");

async function signup(email, password) {
  const hashed = await bcrypt.hash(password, 10);

  await db.query(
    "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
    [email, email, hashed]
  );

  return {
    success: true,
    message: "Account created! Now log in."
  };
}

async function login(email, password) {
  const result = await db.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    return {
      success: false,
      message: "Account not found."
    };
  }

  const user = result.rows[0];

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return {
      success: false,
      message: "Wrong password."
    };
  }

  return {
    success: true,
    user
  };
}

module.exports = {
  signup,
  login
};