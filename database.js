const { Pool } = require("pg");

const db = new Pool({
    user: "postgres",
    host: "localhost",
    database: "nova",
    password: "Liam1Lili",
    port: 5432,
});

module.exports = db;