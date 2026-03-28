const { keyPairFromSeed } = require('./eddsa');
require('dotenv').config();

const hexSeed = process.env.EDDSA_SEED;
if (!hexSeed || hexSeed.length !== 64) {
    throw new Error('EDDSA_SEED must be set and be 32 bytes/64 hex chars.');
}
const keyPair = keyPairFromSeed(hexSeed);

module.exports = { keyPair };