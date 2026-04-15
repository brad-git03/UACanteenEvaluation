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
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                ua_id VARCHAR(50) UNIQUE NOT NULL, 
                full_name VARCHAR(100) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'student', 
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

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
        
        await pool.query(`ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS attachment TEXT;`);
        await pool.query(`ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS is_quarantined BOOLEAN DEFAULT FALSE;`);
        await pool.query(`ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;`);
        
        // 👉 THIS IS THE MISSING PIECE!
        await pool.query(`
            CREATE TABLE IF NOT EXISTS stalls (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL
            );
        `);

        const stallCount = await pool.query('SELECT COUNT(*) FROM stalls');
        if (parseInt(stallCount.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO stalls (name) VALUES 
                ('Main Hot Meals'), ('Snacks & Sandwiches'), ('Drinks & Desserts'), ('Noodles & Dimsum'), ('Fast Food Corner');
            `);
            console.log("🍽️ Automatically inserted 5 default food stalls.");
        }

        console.log("✅ Database initialized: 'users', 'feedbacks', and 'stalls' tables are ready.");
    } catch (err) {
        console.error("❌ Failed to create table:", err.message);
    }
}

initDB();

const addFeedback = async ({ user_id, customer_name, rating, comment, signature, public_key, attachment }) => {
    const query = `
        INSERT INTO feedbacks (user_id, customer_name, rating, comment, signature, public_key, attachment)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at
    `;
    const values = [user_id, customer_name, rating, comment, signature, public_key, attachment];
    const res = await pool.query(query, values);
    return res.rows[0];
};

async function getAllFeedback() {
    const result = await pool.query(`SELECT * FROM feedbacks ORDER BY created_at DESC`);
    return result.rows;
}

async function getFeedbackPhoto(id) {
    const result = await pool.query(`SELECT attachment FROM feedbacks WHERE id = $1`, [id]);
    return result.rows[0];
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

async function getAllStalls() {
    const result = await pool.query(`SELECT * FROM stalls ORDER BY name ASC`);
    return result.rows;
}

async function addStall(name) {
    const result = await pool.query(`INSERT INTO stalls (name) VALUES ($1) RETURNING *`, [name]);
    return result.rows[0];
}

async function deleteStall(id) {
    await pool.query(`DELETE FROM stalls WHERE id = $1`, [id]);
}

module.exports = { 
    pool, addFeedback, getAllFeedback, deleteFeedback, quarantineFeedback, 
    tamperFeedback, getLightFeedbacks, getFeedbackPhoto,
    getAllStalls, addStall, deleteStall 
};