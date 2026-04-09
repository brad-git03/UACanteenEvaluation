const { Pool } = require('pg');

// Works for both local testing and Render deployments
const pool = new Pool(
    process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {}
);

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS feedbacks (
                id SERIAL PRIMARY KEY,
                customer_name VARCHAR(100),
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                signature TEXT NOT NULL,
                public_key TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // 👉 CRITICAL FIX: Automatically upgrade your database to accept photos
        await pool.query(`ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS attachment TEXT;`);
        await pool.query(`ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS is_quarantined BOOLEAN DEFAULT FALSE;`);
        
        console.log("✅ Database initialized: 'feedbacks' table is ready with new columns.");
    } catch (err) {
        console.error("❌ Failed to create table. Check your credentials:", err.message);
    }
}

initDB();

async function addFeedback({ customer_name, rating, comment, signature, public_key, attachment }) {
    const result = await pool.query(
        `INSERT INTO feedbacks (customer_name, rating, comment, signature, public_key, attachment)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [customer_name, rating, comment, signature, public_key, attachment || null]
    );
    return result.rows[0];
}

async function getAllFeedback() {
    const result = await pool.query(`SELECT * FROM feedbacks ORDER BY created_at DESC`);
    return result.rows;
}

async function quarantineFeedback(id) {
    await pool.query("UPDATE feedbacks SET is_quarantined = TRUE WHERE id = $1", [id]);
}

async function deleteFeedback(id) {
    await pool.query("DELETE FROM feedbacks WHERE id = $1", [id]);
}

async function tamperFeedback(id, rating, comment) {
    await pool.query(
        "UPDATE feedbacks SET rating = $1, comment = $2 WHERE id = $3",
        [rating, comment, id]
    );
}

async function getLightFeedbacks() {
    const result = await pool.query(`SELECT id, customer_name, rating, comment, is_quarantined FROM feedbacks ORDER BY created_at DESC`);
    return result.rows;
}

module.exports = { addFeedback, getAllFeedback, deleteFeedback, quarantineFeedback, tamperFeedback, getLightFeedbacks };