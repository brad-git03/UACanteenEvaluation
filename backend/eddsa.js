const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');

function serializeForSignature(feedbackObj) {
    const name = feedbackObj.customer_name ? String(feedbackObj.customer_name).trim() : "";
    const rating = Number(feedbackObj.rating) || 0;
    const comment = feedbackObj.comment ? String(feedbackObj.comment).trim() : "";
    
    //Extract the image so it is protected by the hash
    const attachment = feedbackObj.attachment ? String(feedbackObj.attachment) : ""; 

    const safeName = encodeURIComponent(name);
    const safeComment = encodeURIComponent(comment);

    const canonicalString = `customer_name=${safeName}&rating=${rating}&comment=${safeComment}&attachment=${attachment}`;
    
    return nacl.util.decodeUTF8(canonicalString);
}

function keyPairFromSeed(hexSeed) {
    const seed = Buffer.from(hexSeed, 'hex');
    return nacl.sign.keyPair.fromSeed(seed);
}

function signFeedback(privateKey, feedbackObj) {
    const messageUint8 = serializeForSignature(feedbackObj);
    const signature = nacl.sign.detached(messageUint8, privateKey);
    return nacl.util.encodeBase64(signature); 
}

function verifySignature(publicKey, feedbackObj, signatureB64) {
    const messageUint8 = serializeForSignature(feedbackObj);
    const signatureUint8 = nacl.util.decodeBase64(signatureB64);
    const pubKeyUint8 = new Uint8Array(publicKey); 
    return nacl.sign.detached.verify(messageUint8, signatureUint8, pubKeyUint8);
}

module.exports = {
    keyPairFromSeed,
    signFeedback,
    verifySignature,
};