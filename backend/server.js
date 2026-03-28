require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { keyPairFromSeed } = require('./eddsa');

const app = express();

// Set up CORS
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || origin.endsWith('.vercel.app') || origin.startsWith('http://localhost')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

// 👉 CRITICAL FIX: Allow the server to accept large Base64 photos without crashing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const hexSeed = process.env.EDDSA_SEED;
if (!hexSeed || hexSeed.length !== 64) {
    throw new Error('EDDSA_SEED must be set and be 32 bytes/64 hex chars.');
}

const { keyPair } = require('./keypair');
module.exports.keyPair = keyPair;

app.use('/api', routes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));