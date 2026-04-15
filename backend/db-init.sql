CREATE TABLE feedbacks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(100),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    signature TEXT NOT NULL,
    public_key TEXT NOT NULL,
    attachment TEXT,
    is_quarantined BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Users Table for Students, Staff, and Admins
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    ua_id VARCHAR(50) UNIQUE NOT NULL, 
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student', 
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS stalls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );



-- 2. Link the Feedbacks table to the Users table
-- (We use ALTER TABLE so we don't delete your existing feedback data)
ALTER TABLE feedbacks 
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
