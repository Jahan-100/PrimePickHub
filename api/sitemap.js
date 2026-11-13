// api/sitemap.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://smxjiwywepeaybhekrck.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseKey) {
        return res.status(500).send('Service Role Key missing in Vercel env.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const baseUrl = 'https://primepickhub.vercel.app';

    try {
        // 1. Products fetch karein
        const { data: products } = await supabase.from('products').select('slug, created_at').eq('is_available', true);
        
        // 2. Blogs fetch karein
        const { data: blogs } = await supabase.from('blogs').select('slug, created_at').eq('is_published', true);

        // 3. Categories fetch karein (site_settings se)
        const { data: settings } = await supabase.from('site_settings').select('custom_categories').eq('id', 1).maybeSingle();
        let categories = [];
        if (settings && settings.custom_categories) {
            const catData = typeof settings.custom_categories === 'string' ? JSON.parse(settings.custom_categories) : settings.custom_categories;
            categories = catData.filter(c => c.name !== '__DELETED__');
        }

        // 4. XML generate karein
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        // Static Pages
        const staticPages = ['', 'blog.html', 'search.html', 'about.html', 'contact.html', 'privacy-policy.html', 'terms.html', 'affiliate-disclosure.html', 'review-policy.html'];
        staticPages.forEach(page => {
            xml += `  <url>\n    <loc>${baseUrl}/${page}</loc>\n    <changefreq>daily</changefreq>\n    <priority>${page === '' ? '1.0' : '0.5'}</priority>\n  </url>\n`;
        });

        // Categories
        categories.forEach(cat => {
            xml += `  <url>\n    <loc>${baseUrl}/category/${cat.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
        });

        // Products
        if (products) {
            products.forEach(p => {
                const lastMod = p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString();
                xml += `  <url>\n    <loc>${baseUrl}/product/${p.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
            });
        }

        // Blogs
        if (blogs) {
            blogs.forEach(b => {
                const lastMod = b.created_at ? new Date(b.created_at).toISOString() : new Date().toISOString();
                xml += `  <url>\n    <loc>${baseUrl}/article.html?slug=${b.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
            });
        }

        xml += `</urlset>`;

        // 5. Send XML
        res.setHeader('Content-Type', 'application/xml');
        res.status(200).send(xml);

    } catch (error) {
        console.error("Sitemap Error:", error);
        res.status(500).send('Error generating sitemap');
    }
};
