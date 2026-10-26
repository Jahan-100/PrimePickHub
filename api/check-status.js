// api/check-status.js (Vercel Serverless Function)
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    // CORS Setup
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // Environment variables se keys uthayein
        const supabaseUrl = process.env.SUPABASE_URL || 'https://smxjiwywepeaybhekrck.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseKey) {
            return res.status(500).json({ success: false, error: 'Service Role Key missing in Vercel settings.' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: products, error } = await supabase
            .from('products')
            .select('id, affiliate_url, title');

        if (error) throw error;

        let updatedCount = 0;
        let unavailableProducts = [];

        for (const product of products) {
            if (!product.affiliate_url) continue;

            try {
                const response = await fetch(product.affiliate_url, {
                    method: 'GET',
                    redirect: 'follow',
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });

                const text = await response.text();
                const lowerText = text.toLowerCase();

                const isDead = response.status === 404 || 
                               lowerText.includes('out of stock') || 
                               lowerText.includes('sold out') || 
                               lowerText.includes('item is no longer available') ||
                               lowerText.includes('product not found') ||
                               lowerText.includes('page not found');

                if (isDead) {
                    await supabase.from('products').update({ is_available: false }).eq('id', product.id);
                    updatedCount++;
                    unavailableProducts.push(product.title);
                } else {
                    await supabase.from('products').update({ is_available: true }).eq('id', product.id);
                }
            } catch (err) {
                console.warn(`Failed to check ${product.id}`);
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: `Checked ${products.length} products. Found ${updatedCount} unavailable.`,
            unavailable: unavailableProducts
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
