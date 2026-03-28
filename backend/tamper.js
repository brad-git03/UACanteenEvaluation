require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool();

async function hackDatabase() {
    console.log("⚠️  INITIATING SIMULATED DATABASE BREACH...");
    
    try {
        // Find the most recent feedback entry
        const getLatest = await pool.query('SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT 1');
        
        if (getLatest.rows.length === 0) {
            console.log("❌ No feedback found in the database to tamper with!");
            process.exit(1);
        }

        const target = getLatest.rows[0];
        console.log(`\n🎯 TARGET ACQUIRED: Feedback ID #${target.id} by ${target.customer_name || 'Anonymous'}`);
        console.log(`   Original Rating: ${target.rating} Stars`);
        console.log(`   Original Comment: "${target.comment}"`);

        // The Hack: Change the rating to 1 and alter the comment directly in SQL
        console.log("\n💉 INJECTING MALICIOUS PAYLOAD (Bypassing Server Logic)...");
        await pool.query(
            `UPDATE feedbacks 
             SET rating = 1, comment = 'HACKED: This canteen is the worst!' 
             WHERE id = $1`,
            [target.id]
        );

        console.log("✅ DATABASE SUCCESSFULLY ALTERED.");
        console.log("👉 Go to your Admin Dashboard and click 'Verify' to test the EdDSA tamper-evident seal.");

    } catch (err) {
        console.error("❌ Hack failed:", err.message);
    } finally {
        pool.end();
    }
}

hackDatabase();