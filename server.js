require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(cors({
  origin:"https://datav1nci.github.io/",
  methods:"GET, POST, PUT, DELETE",
  allowedHeaders:"Content-Type,Authorization"
}));

app.use(cors());

// Connect to Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use Neon DB URL from .env
  ssl: {
    rejectUnauthorized: false,
  },
});

// Create tables if they don't exist
const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS blocked_slots (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        time TEXT NOT NULL
      );
    `);

    console.log("Tables checked/created successfully.");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
};
createTables();

// ✅ Get all appointments
app.get("/appointments", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM appointments");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// ✅ Book an appointment
app.post("/appointments", async (req, res) => {
  const { name, date, time } = req.body;

  try {
    // Check if slot is already booked or blocked
    const booked = await pool.query("SELECT * FROM appointments WHERE date = $1 AND time = $2", [date, time]);
    if (booked.rows.length > 0) {
      return res.status(400).json({ error: "This slot is already booked." });
    }

    const blocked = await pool.query("SELECT * FROM blocked_slots WHERE date = $1 AND time = $2", [date, time]);
    if (blocked.rows.length > 0) {
      return res.status(400).json({ error: "This slot is blocked by admin." });
    }

    // Insert appointment
    const result = await pool.query(
      "INSERT INTO appointments (name, date, time) VALUES ($1, $2, $3) RETURNING *",
      [name, date, time]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to save appointment" });
  }
});

// ✅ Delete an appointment
app.delete("/appointments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM appointments WHERE id = $1", [id]);
    res.json({ message: "Appointment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete appointment" });
  }
});

// ✅ Get all blocked slots
app.get("/blockedSlots", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM blocked_slots");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch blocked slots" });
  }
});

// ✅ Block a slot
app.post("/blockedSlots", async (req, res) => {
  const { date, time } = req.body;

  try {
    // Check if slot is already booked or blocked
    const booked = await pool.query("SELECT * FROM appointments WHERE date = $1 AND time = $2", [date, time]);
    if (booked.rows.length > 0) {
      return res.status(400).json({ error: "This slot is already booked." });
    }

    const blocked = await pool.query("SELECT * FROM blocked_slots WHERE date = $1 AND time = $2", [date, time]);
    if (blocked.rows.length > 0) {
      return res.status(400).json({ error: "This slot is already blocked." });
    }

    // Insert blocked slot
    const result = await pool.query(
      "INSERT INTO blocked_slots (date, time) VALUES ($1, $2) RETURNING *",
      [date, time]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to block slot" });
  }
});

// ✅ Unblock a slot
app.delete("/blockedSlots/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM blocked_slots WHERE id = $1", [id]);
    res.json({ message: "Slot unblocked successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to unblock slot" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
