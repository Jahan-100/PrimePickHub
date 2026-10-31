// api/discover-products.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    const apifyToken = process.env.APIFY_API_TOKEN;

    if (!apiKey || !apifyToken) return res.status(500).json({ error: 'API keys missing. Check Vercel Environment Variables.' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        // 1. Apify se Amazon ke Best Sellers fetch karein (US & UK)
        const apifyUrl = `https://api.apify.com/v2/acts/zet46~amazon-best-sellers-scraper/run-sync-get-dataset-items?token=${apifyToken}`;
        
        const apifyResponse = await fetch(apifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                categorySlugs: ["electronics", "fashion", "home-kitchen"],
                maxItems: 30 
            })
        });

        const rawProducts = await apifyResponse.json();
        if (!rawProducts || rawProducts.length === 0) throw new Error("Apify se data nahi mila.");

        // 2. AI ko call karein (Data ko clean aur structured karne ke liye)
        const prompt = `You are an expert dropshipping researcher. 
        Here is a list of raw best-selling products from Amazon US/UK:
        ${JSON.stringify(rawProducts.slice(0, 10))}
        
        Select the top 6 products. Return ONLY a valid JSON array (no markdown, no extra text). Format:
        [
          {
            "asin_or_id": "B0XXXXXX",
            "title": "Product Name",
            "image_url": "https://...",
            "original_url": "https://amazon.com/dp/...",
            "platform": "Amazon",
            "country": "US",
            "sales_count": 15000,
            "rank_position": 1
          }
        ]`;

        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-lite-preview-02-05:free",
                messages: [{ role: "user", content: prompt }]
            })
        });

        const aiData = await aiResponse.json();
        let aiContent = aiData.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Agar AI ne ghalti se koi text likh diya ho toh sirf JSON nikaalein
        const jsonStart = aiContent.indexOf('[');
        const jsonEnd = aiContent.lastIndexOf(']') + 1;
        if (jsonStart !== -1 && jsonEnd !== -1) aiContent = aiContent.substring(jsonStart, jsonEnd);

        const finalProducts = JSON.parse(aiContent);

        // 3. Supabase mein save karein
        const insertData = finalProducts.map(p => ({ ...p, status: 'pending' }));
        
        const { error: dbError } = await supabase
            .from('discovered_products')
            .upsert(insertData, { onConflict: 'asin_or_id', ignoreDuplicates: true });

        if (dbError) throw dbError;

        return res.status(200).json({ success: true, message: `${finalProducts.length} products discovered!` });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};
