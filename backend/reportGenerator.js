const PDFDocument = require('pdfkit');

/**
 * Generates an analytical PDF report based on collected feedback for a specific store.
 * @param {Object} reportData - Object containing store metrics and feedback
 * @param {Object} res - Express response object to stream the PDF
 */
function generateStoreReport(reportData, res = null) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });

        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            let pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        if (res) {
            // Set response headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="Evaluation_Report_${reportData.storeName.replace(/\s+/g, '_')}.pdf"`
            );
            doc.pipe(res);
        }

    // --- COLORS & STYLING ---
    const colors = {
        primary: '#0c2340',
        secondary: '#e5a823',
        text: '#333333',
        lightBg: '#f2f2f2',
        danger: '#d32f2f',
        success: '#388e3c'
    };

    // --- 1. HEADER (Store Overview) ---
    doc.rect(0, 0, 612, 120).fill(colors.primary);
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('Canteen Evaluation Report', 50, 40);
    doc.fontSize(14).font('Helvetica').text(`Generated for: ${reportData.storeName}`, 50, 75);
    doc.fontSize(10).text(`Reporting Date: ${new Date().toLocaleDateString()}`, 50, 95);

    doc.moveDown(3);

    // --- 2. RAW EVALUATIONS & FEEDBACK ---
    doc.fillColor(colors.text).fontSize(16).font('Helvetica-Bold').text('1. Specific Student Evaluations');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text('The following is the unedited chronological feedback submitted by students/staff:');
    doc.moveDown();

    if (!reportData.feedbacks || reportData.feedbacks.length === 0) {
        doc.fontSize(10).font('Helvetica-Oblique').fillColor(colors.text).text('No specific evaluations have been recorded for this stall yet.');
    } else {
        reportData.feedbacks.slice(0, 15).forEach((f, idx) => { // limit to 15 to prevent huge PDFs for now
            // Strip the internal cryptographic payload bracket text from the visible comment
            const cleanComment = (f.comment || '').replace(/\[Stall:.*?\]\s*\[Scores.*?\]\s*/g, '').trim() || 'No written comment';

            // Calculate exact height needed for this specific comment
            const commentHeight = doc.font('Helvetica').fontSize(10).heightOfString(`"${cleanComment}"`, { width: 490 });
            const boxTopPadding = 12;
            const textYOffset = 32;
            const paddingBottom = 16;
            const boxHeight = textYOffset + commentHeight + paddingBottom;

            // Pagination protection
            if (doc.y + boxHeight > 730) { doc.addPage(); }

            const startY = doc.y;
            
            // Draw a subtle border frame dynamically sized
            doc.rect(50, startY, 512, boxHeight).fillAndStroke(colors.lightBg, colors.lightBg);
            
            // Absolute position the inner text relative to startY
            doc.fillColor(colors.text).font('Helvetica-Bold').fontSize(11).text(`Customer: Anonymous`, 60, startY + 12);
            
            const starColor = f.rating >= 4 ? colors.success : (f.rating >= 3 ? colors.secondary : colors.danger);
            doc.fillColor(starColor).text(`${f.rating}/5 Stars`, 480, startY + 12);
            
            // Print the beautifully cleaned comment
            doc.fillColor(colors.text).font('Helvetica').fontSize(10).text(`"${cleanComment}"`, 60, startY + textYOffset, { width: 490 });
            
            // Explicitly push the cursor down past the dynamic box for the next item
            doc.y = startY + boxHeight + 15; 
        });
        if (reportData.feedbacks.length > 15) {
            doc.fillColor(colors.text).fontSize(10).font('Helvetica-Oblique').text(`...and ${reportData.feedbacks.length - 15} more records hidden for brevity.`, 50, doc.y);
        }
    }

    doc.addPage();

    // --- 3. OVERALL SCORE & AI INTERPRETED FEEDBACK ---
    doc.fillColor(colors.text).fontSize(16).font('Helvetica-Bold').text('2. Evaluation Summary & AI Interpretation');
    doc.moveDown(0.5);
    
    // Draw Stat Boxes
    const startY = doc.y + 10;
    doc.lineWidth(1).rect(50, startY, 240, 60).stroke(colors.secondary);
    doc.rect(300, startY, 240, 60).stroke(colors.secondary);
    
    doc.fontSize(12).font('Helvetica').text('Total Evaluations:', 60, startY + 15);
    doc.fontSize(20).font('Helvetica-Bold').fillColor(colors.primary).text(`${reportData.totalEvaluations}`, 60, startY + 30);
    
    doc.fillColor(colors.text).fontSize(12).font('Helvetica').text('Overall Rating:', 310, startY + 15);
    doc.fontSize(20).font('Helvetica-Bold').fillColor(colors.secondary).text(`${reportData.overallRating.toFixed(1)} / 5.0`, 310, startY + 30);

    doc.moveDown(6);


    // AI Interpretation Block
    doc.fillColor(colors.text).fontSize(14).font('Helvetica-Bold').text('AI Interpreted Feedback Summary:', 50, doc.y);
    doc.moveDown(0.5);
    
    // Save the Y mapping before drawing the background box
    const aiBoxY = doc.y;
    doc.rect(50, aiBoxY, 512, 170).fillAndStroke('#eef2f6', '#eef2f6');
    
    let aiText = "";

    // 👉 NEW: Prioritize True AI response from Google Gemini if available!
    if (reportData.ai_summary) {
        aiText = reportData.ai_summary;
    } else {
        // Fallback to offline NLP mock if no API key is provided
        aiText += `Based on the ${reportData.totalEvaluations} reviews analyzed, ${reportData.storeName} has an overall performance score of ${reportData.overallRating.toFixed(1)} out of 5. \n\n`;
        if (reportData.overallRating >= 4.0) {
            aiText += `The general sentiment is highly positive. Customers frequently praised the establishment, with strong indicators pointing toward excellent service and food quality.`;
        } else if (reportData.overallRating >= 3.0) {
            aiText += `The establishment is performing at an average capacity. Customers appreciate certain aspects but point out areas needing refinement, specifically regarding consistency.`;
        } else {
            aiText += `The sentiment indicates significant dissatisfaction. Consistent negative trends were found across multiple customer touchpoints, requiring immediate intervention.`;
        }

        const lowestCategory = Object.entries(reportData.categories).sort((a,b) => a[1] - b[1])[0];
        const highestCategory = Object.entries(reportData.categories).sort((a,b) => b[1] - a[1])[0];

        if (lowestCategory && highestCategory && lowestCategory[0] !== highestCategory[0]) {
            aiText += `\n\nAnalytic Breakdown: The strongest area highlighted by customers is ${highestCategory[0]} (${highestCategory[1].toFixed(1)}/5). However, natural language processing emphasizes that ${lowestCategory[0]} is the primary pain point lowering the overall average (${lowestCategory[1].toFixed(1)}/5). Recommendation: Focus immediate improvements on ${lowestCategory[0].toLowerCase()} to elevate overall student satisfaction.`;
        } else {
            aiText += `\n\nAnalytic Breakdown: Feedback metrics are generally uniform across all tracked categories (Food, Service, Cleanliness, Price). Ensure holistic quality control to improve rankings.`;
        }
    }

    // Embed the text explicitly starting below the top of the AI Box we drew!
    doc.fillColor('#1E293B').fontSize(11).font('Helvetica').text(aiText, 65, aiBoxY + 16, { width: 480, lineGap: 4 });

    // Finalize PDF
    doc.end();
    });
}

/**
 * Analyzes raw feedback arrays and transforms them into structured data for the report.
 * Uses rudimentary keyword matching to estimate category scores if they aren't directly in the DB.
 */
async function analyzeFeedbackData(storeName, feedbacks) {
    let totalScore = 0;
    const positiveComments = [];
    const negativeComments = [];

    const categoryData = {
        'Food Quality': { total: 0, count: 0, keywords: ['food', 'taste', 'delicious', 'cold', 'salty', 'bland'] },
        'Service': { total: 0, count: 0, keywords: ['service', 'slow', 'fast', 'staff', 'rude', 'friendly', 'line'] },
        'Cleanliness': { total: 0, count: 0, keywords: ['clean', 'dirty', 'table', 'hygiene', 'messy'] },
        'Value for Money': { total: 0, count: 0, keywords: ['price', 'value', 'expensive'] }
    };

    // Accumulate all plain text comments for the AI payload
    const rawCommentsForAI = [];

    feedbacks.forEach(f => {
        totalScore += f.rating;
        
        // Bucket comments
        if (f.rating >= 4 && f.comment.trim()) positiveComments.push(f.comment);
        if (f.rating <= 3 && f.comment.trim()) negativeComments.push(f.comment);

        if (f.comment.trim()) rawCommentsForAI.push(f.comment);

        // Estimate category scores based on comment keywords matching base rating
        const commentLower = f.comment.toLowerCase();
        Object.keys(categoryData).forEach(cat => {
            if (categoryData[cat].keywords.some(kw => commentLower.includes(kw))) {
                categoryData[cat].total += f.rating;
                categoryData[cat].count++;
            }
        });
    });

    const categories = {};
    const fallbackScore = feedbacks.length > 0 ? totalScore / feedbacks.length : 0; 

    Object.keys(categoryData).forEach(cat => {
        if (categoryData[cat].count > 0) {
            categories[cat] = categoryData[cat].total / categoryData[cat].count;
        } else {
            categories[cat] = fallbackScore;
        }
    });

    // 👉 NEW: LIVE GEMINI AI INTEGRATION
    let aiSummary = "";
    if (process.env.GEMINI_API_KEY && rawCommentsForAI.length > 0) {
        try {
            console.log(`[AI] Requesting Gemini Interpretation for ${storeName} with ${rawCommentsForAI.length} comments...`);
            const prompt = `You are a professional business analyst reviewing feedback for a Canteen food stall named "${storeName}". 
Read the following student reviews:
${rawCommentsForAI.join('\n- ')}

Write a concise, professional 3-sentence summary identifying the overall sentiment, the best quality, and the major area for improvement. Do not use markdown like bold text.`;
            
            const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const aiData = await aiResponse.json();
            if (aiData && aiData.candidates && aiData.candidates[0]) {
                aiSummary = aiData.candidates[0].content.parts[0].text;
                console.log(`[AI] Successfully mapped Gemini AI Summary!`);
            }
        } catch (error) {
            console.error(`[AI] Failed to connect to Gemini API. Falling back to offline heuristic.`, error.message);
        }
    }

    return {
        storeName: storeName,
        totalEvaluations: feedbacks.length,
        overallRating: fallbackScore,
        categories: categories,
        feedbacks: feedbacks, 
        ai_summary: aiSummary, // Added AI pipeline
        positiveComments: positiveComments, 
        negativeComments: negativeComments
    };
}

module.exports = {
    generateStoreReport,
    analyzeFeedbackData
};
