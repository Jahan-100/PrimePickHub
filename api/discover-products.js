const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    const apifyToken = process.env.APIFY_API_TOKEN;
    const admitadClientId = process.env.ADMITAD_CLIENT_ID;
    const admitadClientSecret = process.env.ADMITAD_CLIENT_SECRET;

    // API keys check
    if (!apiKey || !apifyToken) return res.status(500).json({ error: 'OpenRouter or Apify API key missing.' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        let allRawProducts = [];
        let admitadStores = [];

        // 1. Admitad se campaigns (stores) ki list nikaalein
        if (admitadClientId && admitadClientSecret) {
            try {
                // Admitad OAuth token
                const authRes = await fetch('https://api.admitad.com/token/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'client_credentials',
                        client_id: admitadClientId,
                        client_secret: admitadClientSecret,
                        scope: 'advcampaigns'
                    })
                });
                const authData = await authRes.json();
                
                if (authData.access_token) {
                    // Admitad se campaigns fetch karein (limit 5 taake API slow na ho)
                    const campaignsRes = await fetch('https://api.admitad.com/advcampaigns/?limit=5&status=active', {
                        headers: { 'Authorization': `Bearer ${authData.access_token}` }
                    });
                    const campaignsData = await campaignsRes.json();
                    
                    if (campaignsData.results) {
                        admitadStores = campaignsData.results.map(c => c.name).filter(Boolean);
                        console.log("Admitad Stores Found:", admitadStores);
                    }
                }
            } catch (e) {
                console.warn("Admitad fetch failed:", e.message);
            }
        }

        // 2. Amazon Best Sellers
        try {
            const amazonRes = await fetch(`https://api.apify.com/v2/acts/rel8ble~amazon-bestsellers-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryIds: ["electronics", "fashion"], maxItems: 5 })
            });
            const amazonData = await amazonRes.json();
            if (Array.isArray(amazonData) && amazonData.length > 0) {
                allRawProducts = allRawProducts.concat(amazonData.map(p => ({ ...p, source: 'Amazon' })));
            }
        } catch (e) { console.warn("Amazon failed", e); }

        // 3. Admitad Stores se products scrape karein (Generic approach)
        // Agar Admitad se stores mil gaye hain, toh unke naam se search karein
        if (admitadStores.length > 0) {
            for (const store of admitadStores.slice(0, 2)) { // Top 2 stores try karein
                try {
                    const storeRes = await fetch(`https://api.apify.com/v2/acts/epctex~ecommerce-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            query: `${store} best sellers`,
                            maxItems: 5
                        })
                    });
                    const storeData = await storeRes.json();
                    if (Array.isArray(storeData) && storeData.length > 0) {
                        allRawProducts = allRawProducts.concat(storeData.map(p => ({ ...p, source: store })));
                        console.log(`${store} fetched:`, storeData.length);
                    }
                } catch (e) { console.warn(`${store} failed`, e); }
            }
        }

        // 4. Agar Admitad se kuch nahi mila, toh AliExpress aur Alibaba try karein (Fallback)
        if (allRawProducts.length === 0) {
            try {
                const aliRes = await fetch(`https://api.apify.com/v2/acts/epctex~aliexpress-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ startUrls: [{ url: "https://www.aliexpress.com/w/wholesale-best-selling.html" }], maxItems: 5 })
                });
                const aliData = await aliRes.json();
                if (Array.isArray(aliData) && aliData.length > 0) {
                    allRawProducts = allRawProducts.concat(aliData.map(p => ({ ...p, source: 'AliExpress' })));
                }
            } catch (e) { console.warn("AliExpress failed", e); }
        }

        if (allRawProducts.length === 0) {
            return res.status(500).json({ error: "No data found. Check Apify limits or API keys." });
        }

        // 5. AI ko call karein (Mix aur filter karne ke liye)
        const prompt = `You are a JSON-only API. Select exactly 5 best-selling products for the US, UK, and Europe market from this raw data. 
        Include a mix of platforms. Return ONLY a JSON array:
        [
          {
            "asin_or_id": "Unique_ID",
            "title": "Product Name",
            "image_url": "https://...",
            "original_url": "https://...",
            "platform": "Platform/Store Name",
            "country": "US",
            "sales_count": 15000,
            "rank_position": 1
          }
        ]
        Raw Data: ${JSON.stringify(allRawProducts.slice(0, 20))}`;

        const freeModels = [
            "google/gemma-4-26b-a4b-it:free",
            "meta-llama/llama-3.2-3b-instruct:free",
            "mistralai/mistral-7b-instruct:free"
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

        // 6. Supabase mein save karein
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
