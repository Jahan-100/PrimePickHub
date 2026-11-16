const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    // ⭐ 1. ADMIN AUTHENTICATION CHECK ⭐
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    
    const supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    // ⭐ 2. MAIN LOGIC ⭐
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    const apifyToken = process.env.APIFY_API_TOKEN;
    const keyword = req.body && req.body.keyword ? req.body.keyword.trim() : '';

    if (!apiKey || !apifyToken) return res.status(500).json({ error: 'API keys missing in Vercel.' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        console.log("Starting multi-platform fetch...");
        const searchQuery = keyword ? encodeURIComponent(keyword) : 'best-selling';

        const admitadBrands = [
            "Hacoo", "Redmagic", "AliExpress", "Alibaba", "Govee", 
            "Lenovo", "ChicMe", "MEShology", "Turbo VPN", "Stylewe", 
            "Gshopper", "JustFashionNow", "Noracora", "Openhagen", "Italo"
        ];

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

        let mixedRawProducts = [...amazonProducts.slice(0, 10), ...otherProducts.slice(0, 15)];
        mixedRawProducts = mixedRawProducts.sort(() => 0.5 - Math.random());

        const cleanDataForAI = mixedRawProducts.map(p => ({
            title: p.title || p.name,
            url: p.url || p.link || p.productUrl,
            image: p.image || p.imageUrl || p.thumbnail,
            price: p.price || p.minPrice || 0,
            source: p.source
        }));

        const prompt = `You are a JSON API. Select the top 8 best-selling products for US, UK, Europe, Australia from this raw data.
        ${keyword ? `The user is specifically searching for: "${keyword}".` : 'Select globally trending items.'}

        CRITICAL RULES:
        1. Pick a DIVERSE mix of platforms. Do not pick all from Amazon. Include products from AliExpress, Alibaba, Hacoo, etc., if available.
        2. Diversify countries (US, UK, Europe, Australia).
        3. Extract Category (Electronics, Fashion, Home, etc.) and Price.
        4. Return ONLY a valid JSON array of exactly 8 products. NO markdown, NO extra text.
        
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

        if (!finalProducts || finalProducts.length === 0) {
            return res.status(500).json({ error: "AI failed to generate a valid list. Please try again." });
        }

        const isAutoSearch = req.headers['x-vercel-cron'] === '1';
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
