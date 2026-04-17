const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'ua_super_secret_crypto_key_2026';

// Regex to strictly enforce exactly 10 digits (0-9) and nothing else
const isValidUaId = (id) => /^\d{10}$/.test(id);

// --- 1. REGISTER ENDPOINT ---
const registerUser = async (req, res) => {
    const { ua_id, full_name, role, password } = req.body;
    
    // BACKEND VALIDATION: Enforce 10-digit rule
    if (!isValidUaId(ua_id) && role !== 'admin') { // (Allowing admins to have custom IDs if needed, otherwise it blocks students/staff)
        return res.status(400).json({ error: 'Invalid format. UA ID must be exactly 10 digits with no dashes.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            'INSERT INTO users (ua_id, full_name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, ua_id, full_name, role',
            [ua_id, full_name, role, hashedPassword]
        );
        
        res.json({ message: 'User created successfully', user: result.rows[0] });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ error: 'Failed to register user. UA ID might already exist.' });
    }
};

// --- 2. LOGIN ENDPOINT ---
const loginUser = async (req, res) => {
    const { ua_id, password } = req.body;

    // BACKEND VALIDATION: Prevent unnecessary DB queries if format is wrong
    if (!isValidUaId(ua_id) && ua_id !== 'admin') { 
        return res.status(400).json({ error: 'Invalid format. UA ID must be exactly 10 digits.' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE ua_id = $1', [ua_id]);
        const user = result.rows[0];

        if (!user) return res.status(401).json({ error: 'Invalid UA ID or Password' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Invalid UA ID or Password' });

        const token = jwt.sign(
            { id: user.id, ua_id: user.ua_id, role: user.role, full_name: user.full_name },
            JWT_SECRET,
            { expiresIn: '8h' } 
        );

        res.json({ 
            message: 'Login successful', 
            token, 
            user: { ua_id: user.ua_id, full_name: user.full_name, role: user.role } 
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

// --- 3. SECURITY MIDDLEWARE ---
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ error: 'Unauthorized. Please log in.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedPayload = jwt.verify(token, JWT_SECRET);
        req.user = decodedPayload;
        next(); 
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired session. Please log in again.' });
    }
};

module.exports = { registerUser, loginUser, requireAuth };