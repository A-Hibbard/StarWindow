const express = require("express");
const router = express.Router();

const database = require("../../config/database");



router.get("/", async (req, res) => {
  try {
    // const pool = await poolPromise;
    console.log("Getting users")

    // const result = await pool.request().query(`
    
    const result = await database.query(`
        SELECT *
        FROM Users
        ORDER BY id
    `);
    
    res.json(result.rows);

  } catch (error) {
    console.error("Error getting users:", error.message);
    res.status(500).json({ error: "Failed to get users" });
  }
});

// GET /api/users/:id
router.get("/:id", async (req, res) => {
  try {
    // const pool = await poolPromise;

    const result = await database.query(
      ` SELECT *
        FROM Users
        WHERE id = $1
      `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }else{
      res.json(result.rows[0]);
    }

  } catch (error) {
    console.error("Error getting user by id ", req.params.id, " :", error.message);
    res.status(500).json({ error: "Failed to get user" });
  }
});

module.exports = router;