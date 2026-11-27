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

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY missing" });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    let product = null;

    try {
        const { data: pendingProducts } = await supabase.from('products').select('*').eq('blog_status', 'pending').order('created_at', { ascending: true }).limit(1);
        if (!pendingProducts || pendingProducts.length === 0) return res.status(200).json({ message: "No pending blogs." });

        product = pendingProducts[0];
        await supabase.from('products').update({ blog_status: 'processing' }).eq('id', product.id);

        const { data: offers } = await supabase.from('affiliate_offers').select('*').eq('product_id', product.id).limit(1);
        const offer = offers?.[0] || { store_name: 'Store', affiliate_url: '#' };

        const models = ["openrouter/free", "openai/gpt-oss-120b:free", "google/gemini-2.0-flash-exp:free", "meta-llama/llama-3.3-70b-instruct:free", "deepseek/deepseek-r1:free"];

        // ⭐ Honest prompt (no fake personal usage)
        const prompt = `Write a balanced, helpful 600-word product review in HTML.
Product: ${product.title}
Description: ${product.description || 'N/A'}
Store: ${offer.store_name}
Link: ${offer.affiliate_url}
Requirements:
- Use HTML tags <h2>, <h3>, <p>, <ul>, <li>.
- Be honest: mention who it's for, typical pros/cons based on category (do NOT invent personal usage).
- Include "Pros & Cons" section.
- Include affiliate link 2 times with text "Check Price on ${offer.store_name}".
- Return ONLY HTML, no markdown.`;

        let generatedContent = null, usedModel = "";
        for (const model of models) {
            try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
                    signal: AbortSignal.timeout(15000)
                });
                const aiData = await response.json();
                if (aiData.error) continue;
                if (aiData.choices && aiData.choices[0]?.message?.content) {
                    generatedContent = aiData.choices[0].message.content.replace(/```html/g, '').replace(/```/g, '').trim();
                    usedModel = model; break;
                }
            } catch (err) { console.warn(`Model ${model}: ${err.message}`); }
        }

        if (!generatedContent) throw new Error("All AI models failed.");

        const slug = `${product.slug}-review-${Math.floor(Math.random() * 1000)}`;
        const { error: insertErr } = await supabase.from('blogs').insert([{
            title: `Review: ${product.title}`, slug,
            content_html: generatedContent, image_url: product.image_url, is_published: false
        }]);
        if (insertErr) throw insertErr;
        await supabase.from('products').update({ blog_status: 'completed' }).eq('id', product.id);
        return res.status(200).json({ success: true, message: "Blog generated", model: usedModel });
    } catch (err) {
        if (product) await supabase.from('products').update({ blog_status: 'pending' }).eq('id', product.id);
        return res.status(500).json({ error: err.message });
    }
};
