const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    const apifyToken = process.env.APIFY_API_TOKEN;

    if (!apiKey || !apifyToken) return res.status(500).json({ error: 'API keys missing in Vercel.' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        console.log("Starting parallel fetch...");

        // Hum teeno scrapers ko ek sath (parallel) chalayenge taake Vercel timeout na ho
        const fetchAmazon = fetch(`https://api.apify.com/v2/acts/rel8ble~amazon-bestsellers-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryIds: ["electronics", "fashion", "home"], maxItems: 10 })
        }).then(r => r.json()).catch(e => { console.warn("Amazon err", e); return []; });

        const fetchAli = fetch(`https://api.apify.com/v2/acts/epctex~aliexpress-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startUrls: [{ url: "https://www.aliexpress.com/w/wholesale-best-selling.html" }], maxItems: 10 })
        }).then(r => r.json()).catch(e => { console.warn("Ali err", e); return []; });

        const fetchAlibaba = fetch(`https://api.apify.com/v2/acts/epctex~alibaba-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword: "hot selling products", maxItems: 10 })
        }).then(r => r.json()).catch(e => { console.warn("Alibaba err", e); return []; });

        // Teeno ka wait karein
        const [amazonData, aliData, alibabaData] = await Promise.all([fetchAmazon, fetchAli, fetchAlibaba]);

        let allRawProducts = [];

        if (Array.isArray(amazonData) && amazonData.length > 0) {
            allRawProducts = allRawProducts.concat(amazonData.map(p => ({ ...p, source: 'Amazon' })));
        }
        if (Array.isArray(aliData) && aliData.length > 0) {
            allRawProducts = allRawProducts.concat(aliData.map(p => ({ ...p, source: 'AliExpress' })));
        }
        if (Array.isArray(alibabaData) && alibabaData.length > 0) {
            allRawProducts = allRawProducts.concat(alibabaData.map(p => ({ ...p, source: 'Alibaba' })));
        }

        console.log("Total raw products fetched:", allRawProducts.length);

        if (allRawProducts.length === 0) {
            return res.status(500).json({ error: "No data found. Aapka Apify free plan ka credit khatam ho gaya hai ya actors fail ho rahe hain. Apify dashboard check karein." });
        }

        // AI Prompt
        const prompt = `You are a JSON-only API. Select exactly 15 top best-selling products for US, UK, Europe markets from this raw data.
        
        CRITICAL RULES:
        1. You MUST include a mix of platforms. Do not just pick Amazon. Pick at least 4 from AliExpress/Alibaba if available.
        2. Extract or guess the Category (Electronics, Fashion, Home, Beauty, etc.).
        3. Extract the Price (number only, no currency symbols).
        4. Return ONLY valid JSON array. No markdown.
        
        Format:
        [
          {
            "asin_or_id": "Unique_ID",
            "title": "Product Name",
            "image_url": "https://...",
            "original_url": "https://...",
            "platform": "AliExpress/Alibaba/Amazon",
            "country": "US",
            "category": "Electronics/Fashion/Home",
            "price": 25.99,
            "sales_count": 15000,
            "rank_position": 1
          }
        ]
        Raw Data: ${JSON.stringify(allRawProducts.slice(0, 30))}`;

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

        // Save to DB (Ignore Duplicates)
        const insertData = finalProducts.map(p => ({ ...p, status: 'pending' }));
        
        const { error: dbError } = await supabase
            .from('discovered_products')
            .upsert(insertData, { onConflict: 'asin_or_id', ignoreDuplicates: true });

        if (dbError) throw dbError;

        return res.status(200).json({ success: true, message: `${finalProducts.length} new products discovered!` });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};
