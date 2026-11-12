// api/check-status.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const supabaseUrl = process.env.SUPABASE_URL || 'https://smxjiwywepeaybhekrck.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseKey) {
            return res.status(500).json({ success: false, error: 'Service Role Key missing in Vercel env.' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: products, error } = await supabase
            .from('products')
            .select(`id, title, affiliate_offers (affiliate_url)`);

        if (error) throw error;

        let updatedCount = 0;
        let restoredCount = 0;
        let skippedCount = 0;
        let unavailableProducts = [];

        for (const product of products) {
            if (!product.affiliate_offers || product.affiliate_offers.length === 0) continue;

            const link = product.affiliate_offers[0].affiliate_url;
            if (!link || !/^https?:\/\//i.test(link)) continue;

            try {
                const response = await fetch(link, {
                    method: 'GET',
                    redirect: 'follow',
                    signal: AbortSignal.timeout(10000),
                    headers: {
                        // Better User Agent to avoid 403 Forbidden by Amazon/AliExpress
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Upgrade-Insecure-Requests': '1'
                    }
                });

                // Agar 403, 429 (Rate Limit), ya 503 aata hai, toh skip karein
                if ([403, 429, 503].includes(response.status)) {
                    skippedCount++;
                    console.warn(`[SKIP] ${product.title} - HTTP ${response.status} (bot protection)`);
                    continue;
                }

                const text = await response.text();
                const lowerText = text.toLowerCase();

                const isDead = response.status === 404 ||
                               lowerText.includes('out of stock') ||
                               lowerText.includes('sold out') ||
                               lowerText.includes('item is no longer available') ||
                               lowerText.includes('product not found') ||
                               lowerText.includes('page not found') ||
                               lowerText.includes('this listing has ended');

                if (isDead) {
                    await supabase.from('products').update({ is_available: false }).eq('id', product.id);
                    updatedCount++;
                    unavailableProducts.push(product.title);
                    console.log(`[DEAD] ${product.title}`);
                } else {
                    const { data: current } = await supabase
                        .from('products').select('is_available').eq('id', product.id).single();
                    if (current && current.is_available === false) {
                        await supabase.from('products').update({ is_available: true }).eq('id', product.id);
                        restoredCount++;
                        console.log(`[RESTORED] ${product.title}`);
                    }
                }
            } catch (err) {
                skippedCount++;
                console.warn(`[ERR] ${product.title}: ${err.message}`);
            }
        }

        return res.status(200).json({
            success: true,
            message: `Checked ${products.length}. Marked ${updatedCount} unavailable, restored ${restoredCount}, skipped ${skippedCount}.`,
            unavailable: unavailableProducts
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
