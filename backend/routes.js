const express = require('express');
const router = express.Router();
const { addFeedback, getAllFeedback, deleteFeedback, quarantineFeedback, tamperFeedback, getLightFeedbacks, getFeedbackPhoto } = require('./db');
const { signFeedback, verifySignature } = require('./eddsa');
const { keyPair } = require('./keypair');

router.post('/feedback', async (req, res) => {
    // 👉 CRITICAL FIX: Extract the attachment from the incoming request
    let { customer_name, rating, comment, attachment } = req.body;
    
    customer_name = customer_name ? String(customer_name).trim() : null; 
    rating = Number(rating); 
    comment = comment ? String(comment).trim() : "";

    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    if (!comment) return res.status(400).json({ error: 'Comment required' });

    const feedbackForSign = { customer_name, rating, comment, attachment };
    const signature = signFeedback(keyPair.secretKey, feedbackForSign);
    const public_key = Buffer.from(keyPair.publicKey).toString('base64');

    try {
        const inserted = await addFeedback({ customer_name, rating, comment, signature, public_key, attachment });
        res.status(201).json(inserted);
    } catch (e) {
        console.error("Insert Error:", e.message);
        res.status(500).json({ error: "Database insertion failed." });
    }
});

router.get('/feedbacks', async (req, res) => {
    try {
        const rows = await getAllFeedback();
        
        // BULK VERIFICATION: Prevent frontend traffic jam
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
            
            // SECURITY/PERFORMANCE FIX: Strip the massive attachment before returning to the frontend over the network.
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
    // 👉 CRITICAL FIX: Verify the attachment during audits. If the dashboard didn't pre-load it, fetch it!
    let { id, customer_name, rating, comment, signature, public_key, attachment } = req.body;
    
    // Lazy-load the attachment if missing
    if (!attachment && id) {
        try {
            const photoRow = await getFeedbackPhoto(id);
            if (photoRow) attachment = photoRow.attachment || null;
        } catch (e) {}
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

module.exports = router;