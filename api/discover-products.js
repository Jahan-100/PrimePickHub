const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    const apifyToken = process.env.APIFY_API_TOKEN;

    if (!apiKey || !apifyToken) return res.status(500).json({ error: 'API keys missing in Vercel.' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        let allRawProducts = [];

        // 1. Amazon Best Sellers (Multiple Categories)
        try {
            const amazonRes = await fetch(`https://api.apify.com/v2/acts/rel8ble~amazon-bestsellers-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryIds: ["electronics", "fashion", "home", "beauty"], maxItems: 10 })
            });
            const amazonData = await amazonRes.json();
            if (Array.isArray(amazonData) && amazonData.length > 0) {
                allRawProducts = allRawProducts.concat(amazonData.map(p => ({ ...p, source: 'Amazon' })));
            }
        } catch (e) { console.warn("Amazon failed", e); }

        // 2. AliExpress (General Trending)
        try {
            const aliRes = await fetch(`https://api.apify.com/v2/acts/epctex~aliexpress-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    startUrls: [{ url: "https://www.aliexpress.com/w/wholesale-best-selling.html" }],
                    maxItems: 10 
                })
            });
            const aliData = await aliRes.json();
            if (Array.isArray(aliData) && aliData.length > 0) {
                allRawProducts = allRawProducts.concat(aliData.map(p => ({ ...p, source: 'AliExpress' })));
            }
        } catch (e) { console.warn("AliExpress failed", e); }

        // 3. Alibaba (General Trending)
        try {
            const alibabaRes = await fetch(`https://api.apify.com/v2/acts/epctex~alibaba-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: "hot selling products", maxItems: 10 })
            });
            const alibabaData = await alibabaRes.json();
            if (Array.isArray(alibabaData) && alibabaData.length > 0) {
                allRawProducts = allRawProducts.concat(alibabaData.map(p => ({ ...p, source: 'Alibaba' })));
            }
        } catch (e) { console.warn("Alibaba failed", e); }

        if (allRawProducts.length === 0) {
            return res.status(500).json({ error: "No data found from Apify. Check your Apify free limits." });
        }

        // 4. AI ko call karein (Mix categories aur global sales ke liye)
        const prompt = `You are a JSON-only API. Select exactly 5 top best-selling products for the US, UK, and Europe markets from this raw data.
        
        IMPORTANT: The user wants a DIVERSE mix of products across ALL categories (Home & Kitchen, Beauty, Fashion, Electronics, Sports, etc.). Do NOT restrict to just one niche. Pick the most globally trending items.
        
        NO markdown, NO explanation, ONLY the JSON array. Format:
        [
          {
            "asin_or_id": "Unique_ID",
            "title": "Product Name",
            "image_url": "https://...",
            "original_url": "https://...",
            "platform": "AliExpress/Alibaba/Amazon",
            "country": "US",
            "sales_count": 15000,
            "rank_position": 1
          }
        ]
        Raw Data: ${JSON.stringify(allRawProducts.slice(0, 20))}`;

        const freeModels = [
            "google/gemma-4-26b-a4b-it:free", 
            "meta-llama/llama-3.2-3b-instruct:free",
            "mistralai/mistral-7b-instruct:free",
            "openrouter/free"
        ];

        let finalProducts = null;
        let lastError = null;

        for (const model of freeModels) {
            try {
                const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model: model, messages: [{ role: "user", content: prompt }] })
                });

                const aiData = await aiResponse.json();
                if (aiData.error) { lastError = aiData.error.message; continue; }

                if (aiData.choices && aiData.choices[0] && aiData.choices[0].message) {
                    let aiContent = aiData.choices[0].message.content;
                    const jsonStart = aiContent.indexOf('[');
                    const jsonEnd = aiContent.lastIndexOf(']') + 1;
                    
                    if (jsonStart !== -1 && jsonEnd !== -1) {
                        aiContent = aiContent.substring(jsonStart, jsonEnd);
                        finalProducts = JSON.parse(aiContent);
                        break;
                    }
                }
            } catch (err) { lastError = err.message; }
        }

        if (!finalProducts) {
            return res.status(500).json({ error: "AI failed. Last error: " + lastError });
        }

        // 5. Supabase mein save karein
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
