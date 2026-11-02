const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    // Check if it's a Vercel Cron job (automatic search)
    const isAutoSearch = req.headers['x-vercel-cron'] === '1';
    
    // Allow GET for Vercel Cron, otherwise require POST
    if (req.method !== 'POST' && !isAutoSearch) {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const apifyToken = process.env.APIFY_API_TOKEN;
    
    const keyword = req.body && req.body.keyword ? req.body.keyword.trim() : '';

    if (!apiKey || !apifyToken) return res.status(500).json({ error: 'API keys missing in Vercel.' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        console.log("Starting multi-platform fetch...");
        const searchQuery = keyword ? encodeURIComponent(keyword) : 'best-selling';

        // Admitad ke tamam joined brands ki list
        const admitadBrands = [
            "Hacoo", "Redmagic", "AliExpress", "Alibaba", "Govee", 
            "Lenovo", "ChicMe", "MEShology", "Turbo VPN", "Stylewe", 
            "Gshopper", "JustFashionNow", "Noracora", "Openhagen", "Italo"
        ];

        // 1. Amazon Scraper
        const fetchAmazon = fetch(`https://api.apify.com/v2/acts/rel8ble~amazon-bestsellers-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryIds: ["electronics", "fashion", "home"], maxItems: 10 })
        }).then(r => r.json()).catch(e => []);

        // 2. AliExpress Scraper
        const fetchAli = fetch(`https://api.apify.com/v2/acts/epctex~aliexpress-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startUrls: [{ url: `https://www.aliexpress.com/w/wholesale-${searchQuery}.html` }], maxItems: 10 })
        }).then(r => r.json()).catch(e => []);

        // 3. Alibaba Scraper
        const fetchAlibaba = fetch(`https://api.apify.com/v2/acts/epctex~alibaba-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword: keyword || "hot selling products", maxItems: 10 })
        }).then(r => r.json()).catch(e => []);

        // 4. Admitad ke brands ke liye generic search (Hum top 5 random brands uthayenge har dafa)
        const shuffledBrands = admitadBrands.sort(() => 0.5 - Math.random());
        const selectedBrands = shuffledBrands.slice(0, 5); 
        
        const brandFetches = selectedBrands.map(brand => {
            return fetch(`https://api.apify.com/v2/acts/epctex~ecommerce-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: `${brand} best sellers ${searchQuery}`, maxItems: 5 })
            }).then(r => r.json()).then(data => {
                if (Array.isArray(data)) return data.map(p => ({ ...p, source: brand }));
                return [];
            }).catch(e => []);
        });

        // Sab data ek sath fetch karein (Parallel)
        const [amazonData, aliData, alibabaData, ...brandsData] = await Promise.all([fetchAmazon, fetchAli, fetchAlibaba, ...brandFetches]);

        let amazonProducts = [];
        let otherProducts = [];

        if (Array.isArray(amazonData)) amazonProducts = amazonData.map(p => ({ ...p, source: 'Amazon' }));
        if (Array.isArray(aliData)) otherProducts = otherProducts.concat(aliData.map(p => ({ ...p, source: 'AliExpress' })));
        if (Array.isArray(alibabaData)) otherProducts = otherProducts.concat(alibabaData.map(p => ({ ...p, source: 'Alibaba' })));
        
        brandsData.forEach(arr => {
            if (Array.isArray(arr)) otherProducts = otherProducts.concat(arr);
        });

        if (amazonProducts.length === 0 && otherProducts.length === 0) {
            return res.status(500).json({ error: "No data found from Apify. Check Apify limits." });
        }

        // Shuffle aur mix karein taake AI ke paas variety ho
        let mixedRawProducts = [...amazonProducts.slice(0, 5), ...otherProducts.slice(0, 15)];
        mixedRawProducts = mixedRawProducts.sort(() => 0.5 - Math.random());

        // Data ko AI ke liye clean karein
        const cleanDataForAI = mixedRawProducts.map(p => ({
            title: p.title || p.name,
            url: p.url || p.link || p.productUrl,
            image: p.image || p.imageUrl || p.thumbnail,
            price: p.price || p.minPrice || 0,
            source: p.source
        }));

        // AI Prompt (Strictly 8 products, max 2 from Amazon)
        const prompt = `You are a JSON API. Select exactly 8 best-selling products for US, UK, Europe, Australia from this raw data.
        ${keyword ? `The user is specifically searching for: "${keyword}".` : 'Select globally trending items.'}

        CRITICAL RULES:
        1. Pick AT MOST 2 products from Amazon. The remaining 6 products MUST be from other platforms (AliExpress, Alibaba, Hacoo, Govee, etc.).
        2. Diversify countries (US, UK, Europe, Australia). Do NOT make them all "US".
        3. Extract Category (Electronics, Fashion, Home, etc.) and Price.
        4. Return ONLY a valid JSON array. NO markdown, NO extra text.
        
        Format:
        [
          {
            "asin_or_id": "Unique_ID",
            "title": "Product Name",
            "image_url": "https://...",
            "original_url": "https://...",
            "platform": "Amazon/AliExpress/Hacoo/etc",
            "country": "US/UK/Europe/Australia",
            "category": "Electronics/Fashion/Home",
            "price": 25.99,
            "sales_count": 15000,
            "rank_position": 1
          }
        ]
        Raw Data: ${JSON.stringify(cleanDataForAI)}`;

        const freeModels = ["openrouter/free"];
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
                        try {
                            finalProducts = JSON.parse(aiContent);
                            break;
                        } catch (parseError) {
                            lastError = "JSON Parse Error (Incomplete output)";
                        }
                    }
                }
            } catch (err) { lastError = err.message; }
        }

        if (!finalProducts) return res.status(500).json({ error: "AI failed. Last error: " + lastError });

        // ⭐ Emoji sirf Auto Search (Cron Job) par add hoga
        const insertData = finalProducts.map(p => {
            let finalTitle = p.title;
            if (isAutoSearch) {
                finalTitle = `🤖 ${p.title}`; 
            }
            return { ...p, title: finalTitle, status: 'pending' };
        });
        
        const { error: dbError } = await supabase.from('discovered_products').upsert(insertData, { onConflict: 'asin_or_id', ignoreDuplicates: true });

        if (dbError) throw dbError;

        return res.status(200).json({ success: true, message: `${finalProducts.length} new products discovered!` });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};
