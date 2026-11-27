const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
        const token = authHeader.split(' ')[1];
        const supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
        if (authError || !user) return res.status(401).json({ error: 'Invalid token' });
        const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseKey) return res.status(500).json({ success: false, error: 'Supabase env vars missing.' });

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: products, error } = await supabase.from('products').select('id, title, affiliate_offers (affiliate_url)');
        if (error) throw error;

        let updatedCount = 0, restoredCount = 0, skippedCount = 0, unavailableProducts = [];
        const BATCH = 12;
        const batch = products.slice(0, BATCH);

        for (const product of batch) {
            if (!product.affiliate_offers?.length) continue;
            const link = product.affiliate_offers[0].affiliate_url;
            if (!link || !/^https?:\/\//i.test(link)) continue;
            try {
                const response = await fetch(link, {
                    method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(8000),
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5'
                    }
                });
                if ([403, 429, 503].includes(response.status)) { skippedCount++; continue; }
                const text = await response.text();
                const lowerText = text.toLowerCase();
                const isDead = response.status === 404 ||
                    lowerText.includes('item is no longer available') ||
                    lowerText.includes('this listing has ended') ||
                    lowerText.includes('product not found') ||
                    lowerText.includes('page not found');
                if (isDead) {
                    await supabase.from('products').update({ is_available: false }).eq('id', product.id);
                    updatedCount++; unavailableProducts.push(product.title);
                } else {
                    const { data: current } = await supabase.from('products').select('is_available').eq('id', product.id).single();
                    if (current && current.is_available === false) {
                        await supabase.from('products').update({ is_available: true }).eq('id', product.id);
                        restoredCount++;
                    }
                }
            } catch (err) { skippedCount++; }
        }

        return res.status(200).json({
            success: true,
            message: `Checked ${batch.length}/${products.length}. Marked ${updatedCount} unavailable, restored ${restoredCount}, skipped ${skippedCount}.`,
            unavailable: unavailableProducts,
            remaining: Math.max(0, products.length - BATCH)
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
