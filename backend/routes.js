const express = require('express');
const router = express.Router();
const {
    addFeedback, getAllFeedback, deleteFeedback, quarantineFeedback,
    tamperFeedback, getLightFeedbacks, getFeedbackPhoto,
    getAllStalls, addStall, deleteStall, editStall
} = require('./db');
const { verifySignature } = require('./eddsa');

// 👉 CLOUDINARY CONFIGURATION
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 👇 1. Import our new Authentication logic
const { registerUser, loginUser, requireAuth } = require('./auth');

// --- IDENTITY & AUTH ROUTES ---
router.post('/register', registerUser);
router.post('/login', loginUser);

// --- SECURE FEEDBACK ROUTE ---
// 👇 2. Notice requireAuth is inserted right here as a "bouncer"!
router.post('/feedback', requireAuth, async (req, res) => {

    // We no longer extract customer_name from req.body!
    let { rating, comment, attachment, signature, public_key } = req.body;

    // 🔒 AUTHENTICITY ENFORCEMENT: 
    // We strictly use the identity verified by the JWT token.
    const customer_name = req.user.full_name;
    const user_id = req.user.id;

    rating = Number(rating);
    comment = comment ? String(comment).trim() : "";

    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    if (!comment) return res.status(400).json({ error: 'Comment required' });
    if (!signature || !public_key) return res.status(400).json({ error: 'Cryptographic signature and public key are required.' });

    // 1. Reconstruct the payload exactly as the frontend signed it (Using original Base64 attachment).
    const feedbackForVerify = { customer_name, rating, comment, attachment };

    // 2. VERIFY the frontend's signature BEFORE doing anything else
    try {
        const pubKeyBin = Buffer.from(public_key, 'base64');
        const isValid = verifySignature(pubKeyBin, feedbackForVerify, signature);

        if (!isValid) {
            return res.status(401).json({ error: 'Data integrity check failed: Invalid signature.' });
        }
    } catch (e) {
        return res.status(401).json({ error: 'Malformed cryptographic keys provided.' });
    }

    // 👉 3. CLOUDINARY UPLOAD: Now that signature is verified, swap the heavy Base64 string for a Cloud URL!
    try {
        if (attachment && !attachment.startsWith('http')) {
            const uploadRes = await cloudinary.uploader.upload(attachment, { folder: 'ua_canteen/feedback' });
            attachment = uploadRes.secure_url; // Replace string with URL
        }
    } catch (uploadError) {
        console.error("Cloudinary Error:", uploadError);
        return res.status(500).json({ error: "Failed to upload image to cloud storage." });
    }

    // 4. Insert it into PostgreSQL linking their user_id and the new short Cloudinary URL!
    try {
        const inserted = await addFeedback({ user_id, customer_name, rating, comment, signature, public_key, attachment });
        res.status(201).json(inserted);
    } catch (e) {
        console.error("Insert Error:", e.message);
        res.status(500).json({ error: "Database insertion failed." });
    }
});


router.get('/feedbacks', async (req, res) => {
    try {
        const rows = await getAllFeedback();

        const verifiedRows = rows.map(row => {
            const feedbackForVerify = {
                customer_name: row.customer_name,
                rating: row.rating,
                comment: row.comment,
                attachment: row.attachment
            };
            let valid = false;
            try {
                const pubKeyBin = Buffer.from(row.public_key, 'base64');
                valid = verifySignature(pubKeyBin, feedbackForVerify, row.signature);
            } catch (e) {
                valid = false;
            }

            const has_attachment = !!row.attachment;
            delete row.attachment;

            return { ...row, _is_signature_valid: valid, has_attachment };
        });

        res.json(verifiedRows);
    } catch (e) {
        res.status(500).json({ error: "Couldn't fetch feedback." });
    }
});

router.get('/feedbacks/light', async (req, res) => {
    try {
        const rows = await getLightFeedbacks();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: "Couldn't fetch light feedback." });
    }
});

router.get('/feedback/:id/photo', async (req, res) => {
    try {
        const row = await getFeedbackPhoto(req.params.id);
        if (row && row.attachment) {
            res.json({ attachment: row.attachment });
        } else {
            res.status(404).json({ error: "No photo found" });
        }
    } catch (e) {
        res.status(500).json({ error: "Couldn't fetch photo." });
    }
});

router.post('/verify', async (req, res) => {
    let { id, customer_name, rating, comment, signature, public_key, attachment } = req.body;

    if (!attachment && id) {
        try {
            const photoRow = await getFeedbackPhoto(id);
            if (photoRow) attachment = photoRow.attachment || null;
        } catch (e) { }
    }

    const feedbackForVerify = { customer_name, rating, comment, attachment };

    try {
        const pubKeyBin = Buffer.from(public_key, 'base64');
        const valid = verifySignature(pubKeyBin, feedbackForVerify, signature);
        res.json({ valid });
    } catch (e) {
        res.json({ valid: false, error: "Malformed cryptographic data." });
    }
});

router.delete('/feedback/:id', async (req, res) => {
    try {
        await deleteFeedback(req.params.id);
        res.json({ message: "Record purged successfully" });
    } catch (err) {
        console.error("Delete Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

router.put('/feedback/:id/quarantine', async (req, res) => {
    try {
        await quarantineFeedback(req.params.id);
        res.json({ message: "Record quarantined successfully" });
    } catch (err) {
        console.error("Quarantine Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

router.put('/hack/:id', async (req, res) => {
    try {
        const { rating, comment } = req.body;
        await tamperFeedback(req.params.id, rating, comment);
        res.json({ message: "Database Altered (HACKED)" });
    } catch (err) {
        console.error("Hack Error:", err.message);
        res.status(500).json({ error: "Hack Failed" });
    }
});


// --- STALL MANAGEMENT ROUTES (PostgreSQL) ---

router.get('/stalls', async (req, res) => {
    try {
        const rows = await getAllStalls();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/stalls', async (req, res) => {
    try {
        let { name, image } = req.body;
        if (!name) return res.status(400).json({ error: "Stall name is required" });

        // 👉 CLOUDINARY UPLOAD: Stalls Cover Photo
        if (image && !image.startsWith('http')) {
            const uploadRes = await cloudinary.uploader.upload(image, { folder: 'ua_canteen/stalls' });
            image = uploadRes.secure_url;
        }

        const newStall = await addStall(name, image || null);
        res.json(newStall);
    } catch (err) {
        if (err.message.toLowerCase().includes("unique")) {
            return res.status(400).json({ error: "Stall already exists" });
        }
        res.status(500).json({ error: err.message });
    }
});

router.put('/stalls/:id', async (req, res) => {
    try {
        let { name, image } = req.body;
        if (!name) return res.status(400).json({ error: "Stall name is required" });

        // 👉 CLOUDINARY UPLOAD: Stalls Cover Photo Edit
        if (image && !image.startsWith('http')) {
            const uploadRes = await cloudinary.uploader.upload(image, { folder: 'ua_canteen/stalls' });
            image = uploadRes.secure_url;
        }

        const updatedStall = await editStall(req.params.id, name, image || null);
        res.json(updatedStall);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/stalls/:id', async (req, res) => {
    try {
        await deleteStall(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;