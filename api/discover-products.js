const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    const apifyToken = process.env.APIFY_API_TOKEN;

    if (!apiKey || !apifyToken) return res.status(500).json({ error: 'API keys missing. Check Vercel Environment Variables.' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        // 1. Apify se Amazon ke Best Sellers fetch karein
        const apifyUrl = `https://api.apify.com/v2/acts/zet46~amazon-best-sellers-scraper/run-sync-get-dataset-items?token=${apifyToken}`;
        
        const apifyResponse = await fetch(apifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                categorySlugs: ["electronics", "fashion"],
                maxItems: 10 // Fast response ke liye kam kiya hai
            })
        });

        const rawProducts = await apifyResponse.json();
        if (!rawProducts || rawProducts.length === 0 || rawProducts.error) {
            return res.status(500).json({ error: "Apify error or no data found. " + (rawProducts.message || rawProducts.error || "") });
        }

        // 2. AI ko call karein (Naya Stable Model Use kiya hai)
        const prompt = `You are a JSON-only API. Select the top 5 best-selling products from this raw data and output them as a JSON array. 
        NO markdown, NO explanation, ONLY the JSON array. Format:
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
        ]
        Raw Data: ${JSON.stringify(rawProducts.slice(0, 5))}`;

        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "meta-llama/llama-3-8b-instruct:free", // <--- NAYA MODEL YAHAN HAI
                messages: [{ role: "user", content: prompt }]
            })
        });

        const aiData = await aiResponse.json();
        
        // Agar AI se koi error aaye toh usay handle karein
        if (aiData.error) {
            return res.status(500).json({ error: "AI Error: " + aiData.error.message });
        }
        if (!aiData.choices || !aiData.choices[0] || !aiData.choices[0].message) {
            return res.status(500).json({ error: "AI returned unexpected response. Try again." });
        }

        let aiContent = aiData.choices[0].message.content;
        
        // Safely JSON nikaalein
        const jsonStart = aiContent.indexOf('[');
        const jsonEnd = aiContent.lastIndexOf(']') + 1;
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
            aiContent = aiContent.substring(jsonStart, jsonEnd);
        } else {
            return res.status(500).json({ error: "AI did not return a valid list. Try again." });
        }

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
