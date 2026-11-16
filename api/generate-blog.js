// api/generate-blog.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { productId, title, description, storeName, affiliateUrl, imageUrl } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY missing" });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const models = [ "openrouter/free", "openai/gpt-oss-120b:free", "google/gemini-2.0-flash-exp:free" ];

    // ⭐ FIXED PROMPT: Removed "to help it rank" & asked for original human review ⭐
    const prompt = `You are an expert copywriter writing an honest product review. 
    Write a detailed 600-word blog post in HTML for the following product.
    
    Product Details:
    - Title: ${title}
    - Description: ${description}
    - Store: ${storeName}
    - Affiliate Link: ${affiliateUrl}
    - Image: ${imageUrl}
    
    Instructions:
    1. Use HTML tags like <h2>, <h3>, <p>, <ul>, <li>.
    2. Write like a human who actually used the product. Add realistic pros, cons, and an honest verdict.
    3. Include a "Pros & Cons" section.
    4. Include the affiliate link at least 2 times with text "Check Price on ${storeName}".
    5. Do NOT promise miracles. Be realistic about what the product can do.
    6. Return ONLY the HTML content, no markdown blocks.`;

    let generatedContent = null;
    let usedModel = "";

    for (const model of models) {
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ model: model, messages: [{ role: "user", content: prompt }] })
            });
            const aiData = await response.json();
            if (aiData.error) continue;
            if (aiData.choices && aiData.choices[0]?.message?.content) {
                generatedContent = aiData.choices[0].message.content;
                usedModel = model;
                break;
            }
        } catch (err) { console.warn(`❌ Model ${model} crashed`); }
    }

    if (!generatedContent) return res.status(500).json({ error: "All AI models failed. Please try again later." });

    const cleanContent = generatedContent.replace(/```html/g, '').replace(/```/g, '').trim();

    try {
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(Math.random() * 1000);
        const { error } = await supabase.from('blogs').insert([{
            title: `Review: ${title} - Is It Worth Buying?`,
            slug: slug,
            content_html: cleanContent,
            image_url: imageUrl,
            is_published: false
        }]);
        if (error) throw error;
        return res.status(200).json({ success: true, message: "Draft Blog Generated", model: usedModel });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
