CREATE TABLE IF NOT EXISTS feedbacks (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    signature TEXT NOT NULL,
    public_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);