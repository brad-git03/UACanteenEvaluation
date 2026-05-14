const express = require('express');
const router = express.Router();
const {
    addFeedback, getAllFeedback, deleteFeedback, quarantineFeedback,
    getFeedbackPhoto,
    getAllStalls, addStall, deleteStall, editStall,
    getStallByToken, verifyStallEmail
} = require('./db');
const { verifySignature } = require('./eddsa');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const crypto = require('crypto');

// CLOUDINARY CONFIGURATION
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 1. Import our new Authentication logic
const { registerUser, loginUser, requireAuth } = require('./auth');

// --- IDENTITY & AUTH ROUTES ---
router.post('/register', registerUser);
router.post('/login', loginUser);

// --- SECURE FEEDBACK ROUTE ---
// 2. Notice requireAuth is inserted right here as a "bouncer"!
router.post('/feedback', requireAuth, async (req, res) => {

    // We no longer extract customer_name from req.body!
    let { rating, comment, attachment, signature, public_key } = req.body;

    // AUTHENTICITY ENFORCEMENT: 
    // We strictly use the identity verified by the JWT token.
    const customer_name = req.user.full_name;
    const user_id = req.user.id;

    rating = Number(rating);
    comment = comment ? String(comment).trim() : "";

    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    if (!comment) return res.status(400).json({ error: 'Comment required' });
    if (!signature || !public_key) return res.status(400).json({ error: 'Cryptographic signature and public key are required.' });

    // Reconstruct the payload WITHOUT the attachment for the signature check
    const feedbackForVerify = { customer_name, rating, comment };

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

    // 3. CLOUDINARY UPLOAD: Now that signature is verified, swap the heavy Base64 string for a Cloud URL!
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
            // Reconstruct the payload WITHOUT the attachment for the signature check
            const feedbackForVerify = {
                customer_name: row.customer_name,
                rating: row.rating,
                comment: row.comment
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

    // Reconstruct the payload WITHOUT the attachment for the signature check
    const feedbackForVerify = { customer_name, rating, comment };

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


// --- PDF REPORT GENERATION ROUTE ---
const { generateStoreReport, analyzeFeedbackData } = require('./reportGenerator');

const getVerifiedFeedbacks = (feedbacks) => {
    return feedbacks.filter(row => {
        const feedbackForVerify = {
            customer_name: row.customer_name,
            rating: row.rating,
            comment: row.comment
        };
        try {
            const pubKeyBin = Buffer.from(row.public_key, 'base64');
            return verifySignature(pubKeyBin, feedbackForVerify, row.signature);
        } catch (e) {
            return false;
        }
    });
};

router.get('/reports/overall', async (req, res) => {
    try {
        const rawFeedbacks = await getAllFeedback(); 
        const verifiedFeedbacks = getVerifiedFeedbacks(rawFeedbacks);
        const reportData = await analyzeFeedbackData('UA Main Canteen System', verifiedFeedbacks);
        generateStoreReport(reportData, res);
    } catch (err) {
        console.error(err);
        if (!res.headersSent) res.status(500).json({ error: "Failed to generate report" });
    }
});

router.get('/reports/stall/:id', async (req, res) => {
    try {
        const stallRows = await getAllStalls();
        const stall = stallRows.find(s => s.id == req.params.id);
        if (!stall) return res.status(404).json({ error: "Stall not found" });

        // Extract stall's feedbacks directly from comment cryptographic payload
        const rawFeedbacks = await getAllFeedback(); 
        const verifiedFeedbacks = getVerifiedFeedbacks(rawFeedbacks);
        const stallFeedbacks = verifiedFeedbacks.filter(f => {
            const match = f.comment?.match(/\[Stall: (.*?)\]/);
            return match ? match[1] === stall.name : false;
        });
        
        const reportData = await analyzeFeedbackData(stall.name, stallFeedbacks);
        generateStoreReport(reportData, res);
    } catch (err) {
        console.error(err);
        if (!res.headersSent) res.status(500).json({ error: "Failed to generate stall report" });
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

router.get('/stalls/verify-email', async (req, res) => {
    const { token } = req.query;
    try {
        const stall = await getStallByToken(token);
        if (!stall) return res.status(400).send('Invalid or expired token.');
        await verifyStallEmail(stall.id);
        res.send('Email verified successfully! You can now close this window.');
    } catch (err) {
        res.status(500).send('Verification failed.');
    }
});

router.post('/stalls/:id/send-report', async (req, res) => {
    try {
        const stallRows = await getAllStalls();
        const stall = stallRows.find(s => s.id == req.params.id);
        if (!stall) return res.status(404).json({ error: "Stall not found" });
        if (!stall.email || !stall.is_email_verified) return res.status(400).json({ error: "Stall does not have a verified email." });

        const rawFeedbacks = await getAllFeedback(); 
        const verifiedFeedbacks = getVerifiedFeedbacks(rawFeedbacks);
        const stallFeedbacks = verifiedFeedbacks.filter(f => {
            const match = f.comment?.match(/\[Stall: (.*?)\]/);
            return match ? match[1] === stall.name : false;
        });
        
        const reportData = await analyzeFeedbackData(stall.name, stallFeedbacks);
        
        // Generate PDF Buffer
        const pdfBuffer = await generateStoreReport(reportData);

        // Send Email using Resend
        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: stall.email,
            subject: `Automated Evaluation Report: ${stall.name}`,
            html: `<p>Hello ${stall.name} owner,</p><p>Here is your automated stall evaluation update.</p><p><strong>AI Summary & Recommendations:</strong><br/>${reportData.ai_summary || 'Please find the details in the attached report.'}</p><p>Best,<br/>UA Canteen System</p>`,
            text: `Hello ${stall.name} owner,\n\nHere is your automated stall evaluation update.\n\nAI Summary & Recommendations:\n${reportData.ai_summary || 'Please find the details in the attached report.'}\n\nBest,\nUA Canteen System`,
            attachments: [
                {
                    filename: `Evaluation_Report_${stall.name.replace(/\s+/g, '_')}.pdf`,
                    content: pdfBuffer,
                }
            ]
        });

        res.json({ success: true, message: "Report sent successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send stall report email." });
    }
});
const getVerificationEmailTemplate = (name, verifyUrl) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
  <div style="background-color: #0c2340; color: #ffffff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">UA Canteen System</h1>
  </div>
  <div style="padding: 30px; background-color: #ffffff; color: #333333;">
    <h2 style="margin-top: 0; color: #0c2340;">Verify Your Stall Account</h2>
    <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
    <p style="font-size: 16px; line-height: 1.5;">You have been registered as the official owner of <strong>${name}</strong> on the UA Canteen Evaluation platform. To verify your identity and start receiving automated AI feedback reports, please click the secure link below.</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${verifyUrl}" style="background-color: #e5a823; color: #0c2340; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px; display: inline-block;">Verify Email Address</a>
    </div>
    <p style="font-size: 14px; color: #666666; margin-top: 30px;">If you did not request this, please safely ignore this email.</p>
  </div>
  <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
    &copy; ${new Date().getFullYear()} UA Canteen Evaluation System. This is an automated secure message.
  </div>
</div>
`;

router.post('/stalls', async (req, res) => {
    try {
        let { name, image, email } = req.body;
        if (!name) return res.status(400).json({ error: "Stall name is required" });

        // CLOUDINARY UPLOAD: Stalls Cover Photo
        if (image && !image.startsWith('http')) {
            const uploadRes = await cloudinary.uploader.upload(image, { folder: 'ua_canteen/stalls' });
            image = uploadRes.secure_url;
        }

        let verificationToken = null;
        if (email) {
            verificationToken = crypto.randomBytes(20).toString('hex');
        }

        const newStall = await addStall(name, image || null, email || null, verificationToken);
        
        if (email) {
            const baseUrl = process.env.BACKEND_URL || 'http://localhost:4000';
            const verifyUrl = `${baseUrl}/api/stalls/verify-email?token=${verificationToken}`;
            try {
                const data = await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
                    to: email,
                    subject: `Action Required: Verify ${name} Email`,
                    text: `Please verify your email for ${name} by clicking: ${verifyUrl}`,
                    html: getVerificationEmailTemplate(name, verifyUrl)
                });
                if (data.error) console.error("Resend Error:", data.error);
            } catch (emailErr) {
                console.error("Email sending failed:", emailErr);
            }
        }

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
        let { name, image, email } = req.body;
        if (!name) return res.status(400).json({ error: "Stall name is required" });

        // CLOUDINARY UPLOAD: Stalls Cover Photo Edit
        if (image && !image.startsWith('http')) {
            const uploadRes = await cloudinary.uploader.upload(image, { folder: 'ua_canteen/stalls' });
            image = uploadRes.secure_url;
        }

        const existingStall = (await getAllStalls()).find(s => s.id == req.params.id);
        let verificationToken = existingStall.verification_token;
        let isVerified = existingStall.is_email_verified;
        let emailChanged = email !== existingStall.email;

        if (emailChanged && email) {
            verificationToken = crypto.randomBytes(20).toString('hex');
            isVerified = false;
        } else if (!email) {
            verificationToken = null;
            isVerified = false;
        }

        const updatedStall = await editStall(req.params.id, name, image || null, email || null, isVerified, verificationToken);
        
        if (emailChanged && email) {
            const baseUrl = process.env.BACKEND_URL || 'http://localhost:4000';
            const verifyUrl = `${baseUrl}/api/stalls/verify-email?token=${verificationToken}`;
            try {
                const data = await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
                    to: email,
                    subject: `Action Required: Verify ${name} Email`,
                    text: `Please verify your email for ${name} by clicking: ${verifyUrl}`,
                    html: getVerificationEmailTemplate(name, verifyUrl)
                });
                if (data.error) console.error("Resend Error:", data.error);
            } catch (emailErr) {
                console.error("Email sending failed:", emailErr);
            }
        }

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