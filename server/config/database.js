const { Pool } = require("pg");
require("dotenv").config();

const database = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: process.env.DATABASE_URL.includes("supabase")
    ? { rejectUnauthorized: false }
    : false,
});

// Idle clients can be terminated by the server (Supabase drops idle
// connections). Without this listener, that 'error' event becomes an
// uncaught exception and crashes the process a few seconds after startup.
database.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err.message);
});



async function testConnection() {
  try {
    const result = await database.query("SELECT NOW()");
    console.log("Connected to PostgreSQL at:", result.rows[0].now);
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
  }
}

testConnection();

module.exports = database;