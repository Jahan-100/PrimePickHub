// api/check-status.js (Vercel Serverless Function)
export default async function handler(req, res) {
    // CORS Setup
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // ⚠️ APNI SUPABASE DETAILS YAHAN DALEIN
        const supabaseUrl = 'https://smxjiwywepeaybhekrck.supabase.co';
        const supabaseKey = 'YAHAN_APNI_SERVICE_ROLE_KEY_DALEIN'; // (Settings > API > service_role secret)
        
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch all products with an affiliate URL
        const { data: products, error } = await supabase
            .from('products')
            .select('id, affiliate_url, title');

        if (error) throw error;

        let updatedCount = 0;
        let unavailableProducts = [];

        // Loop through each product
        for (const product of products) {
            if (!product.affiliate_url) continue;

            try {
                // Fetch the URL to check status
                const response = await fetch(product.affiliate_url, {
                    method: 'GET',
                    redirect: 'follow',
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });

                const text = await response.text();
                const lowerText = text.toLowerCase();

                // Check for out of stock indicators
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
                    // If it was dead before but now live
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
