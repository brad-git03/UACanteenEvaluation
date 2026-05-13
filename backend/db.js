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

         await pool.query(`
            CREATE TABLE IF NOT EXISTS stalls (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL
            );
        `);
        
        // Add the image column to the database
        await pool.query(`ALTER TABLE stalls ADD COLUMN IF NOT EXISTS image TEXT;`);
        await pool.query(`ALTER TABLE stalls ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;`);
        await pool.query(`ALTER TABLE stalls ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;`);
        await pool.query(`ALTER TABLE stalls ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);`);

        console.log("Database initialized: 'users', 'feedbacks', and 'stalls' tables are ready.");
    } catch (err) {
        console.error("Failed to create table:", err.message);
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

async function getAllStalls() {
    const result = await pool.query(`SELECT * FROM stalls ORDER BY name ASC`);
    return result.rows;
}

// Saves the image
async function addStall(name, image, email = null, verification_token = null) {
    const result = await pool.query(
        `INSERT INTO stalls (name, image, email, verification_token) VALUES ($1, $2, $3, $4) RETURNING *`, 
        [name, image, email, verification_token]
    );
    return result.rows[0];
}

// Function for the Edit feature!
async function editStall(id, name, image, email = null, is_email_verified = false, verification_token = null) {
    const result = await pool.query(
        `UPDATE stalls SET name = $1, image = $2, email = $3, is_email_verified = $4, verification_token = $5 WHERE id = $6 RETURNING *`, 
        [name, image, email, is_email_verified, verification_token, id]
    );
    return result.rows[0];
}

async function getStallByToken(token) {
    const result = await pool.query(`SELECT * FROM stalls WHERE verification_token = $1`, [token]);
    return result.rows[0];
}

async function verifyStallEmail(id) {
    await pool.query(`UPDATE stalls SET is_email_verified = TRUE, verification_token = NULL WHERE id = $1`, [id]);
}

async function deleteStall(id) {
    await pool.query(`DELETE FROM stalls WHERE id = $1`, [id]);
}

module.exports = {
    pool, addFeedback, getAllFeedback, deleteFeedback, quarantineFeedback,
    getFeedbackPhoto,
    getAllStalls, addStall, editStall, deleteStall,
    getStallByToken, verifyStallEmail
};