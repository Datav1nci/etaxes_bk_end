require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Connected to Neon PostgreSQL:", result.rows[0]);
  } catch (error) {
    console.error("Database connection error:", error);
  } finally {
    pool.end();
  }
}

testConnection();