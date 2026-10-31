const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    const apifyToken = process.env.APIFY_API_TOKEN;
    
    const keyword = req.body.keyword ? req.body.keyword.trim() : '';

    if (!apiKey || !apifyToken) return res.status(500).json({ error: 'API keys missing in Vercel.' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        console.log("Starting fetch...");
        const searchQuery = keyword ? encodeURIComponent(keyword) : 'best-selling';

        const fetchAmazon = fetch(`https://api.apify.com/v2/acts/rel8ble~amazon-bestsellers-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryIds: ["electronics", "fashion", "home"], maxItems: 10 })
        }).then(r => r.json()).catch(e => []);

        const fetchAli = fetch(`https://api.apify.com/v2/acts/epctex~aliexpress-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startUrls: [{ url: `https://www.aliexpress.com/w/wholesale-${searchQuery}.html` }], maxItems: 10 })
        }).then(r => r.json()).catch(e => []);

        const fetchAlibaba = fetch(`https://api.apify.com/v2/acts/epctex~alibaba-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword: keyword || "hot selling products", maxItems: 10 })
        }).then(r => r.json()).catch(e => []);

        const [amazonData, aliData, alibabaData] = await Promise.all([fetchAmazon, fetchAli, fetchAlibaba]);

        let allRawProducts = [];
        if (Array.isArray(amazonData)) allRawProducts = allRawProducts.concat(amazonData.map(p => ({ ...p, source: 'Amazon' })));
        if (Array.isArray(aliData)) allRawProducts = allRawProducts.concat(aliData.map(p => ({ ...p, source: 'AliExpress' })));
        if (Array.isArray(alibabaData)) allRawProducts = allRawProducts.concat(alibabaData.map(p => ({ ...p, source: 'Alibaba' })));

        if (allRawProducts.length === 0) {
            return res.status(500).json({ error: "No data found from Apify." });
        }

        const cleanDataForAI = allRawProducts.slice(0, 15).map(p => ({
            title: p.title || p.name,
            url: p.url || p.link || p.productUrl,
            image: p.image || p.imageUrl || p.thumbnail,
            price: p.price || p.minPrice || 0,
            source: p.source
        }));

        const prompt = `You are a JSON API. Select exactly 8 best-selling products for US, UK, Europe, Australia from this raw data.
        ${keyword ? `Focus on: "${keyword}".` : 'Select trending items.'}

        RULES:
        1. Mix platforms (Amazon, AliExpress, Alibaba).
        2. Diversify countries (US, UK, Europe, Australia).
        3. Extract Category (Electronics, Fashion, Home, etc.) and Price.
        4. Return ONLY a valid JSON array. NO markdown, NO extra text.
        
        Format:
        [
          {
            "asin_or_id": "Unique_ID",
            "title": "Product Name",
            "image_url": "https://...",
            "original_url": "https://...",
            "platform": "Amazon",
            "country": "US",
            "category": "Electronics",
            "price": 25.99,
            "sales_count": 15000,
            "rank_position": 1
          }
        ]
        Raw Data: ${JSON.stringify(cleanDataForAI)}`;

        // ⭐ UPDATED: Naye active free models
        const freeModels = [
            "google/gemini-2.0-flash-lite-preview-02-05:free",
            "mistralai/mistral-7b-instruct:free",
            "huggingfaceh4/zephyr-7b-beta:free",
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
                
                if (aiData.error) { 
                    lastError = aiData.error.message; 
                    console.warn(`Model ${model} failed:`, lastError);
                    continue; 
                }

                if (aiData.choices && aiData.choices[0] && aiData.choices[0].message) {
                    let aiContent = aiData.choices[0].message.content;
                    const jsonStart = aiContent.indexOf('[');
                    const jsonEnd = aiContent.lastIndexOf(']') + 1;
                    
                    if (jsonStart !== -1 && jsonEnd !== -1) {
                        aiContent = aiContent.substring(jsonStart, jsonEnd);
                        try {
                            finalProducts = JSON.parse(aiContent);
                            break; // Kaam ho gaya, loop se bahar
                        } catch (parseError) {
                            lastError = "JSON Parse Error (Incomplete output)";
                        }
                    }
                }
            } catch (err) { lastError = err.message; }
        }

        if (!finalProducts) return res.status(500).json({ error: "All AI models failed. Last error: " + lastError });

        const insertData = finalProducts.map(p => ({ ...p, status: 'pending' }));
        const { error: dbError } = await supabase.from('discovered_products').upsert(insertData, { onConflict: 'asin_or_id', ignoreDuplicates: true });

        if (dbError) throw dbError;

        return res.status(200).json({ success: true, message: `${finalProducts.length} new products discovered!` });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};
