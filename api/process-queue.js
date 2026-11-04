// api/process-queue.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (process.env.CRON_SECRET) {
        const auth = req.headers.authorization || '';
        if (auth !== `Bearer ${process.env.CRON_SECRET}` && req.headers['x-vercel-cron'] !== '1') {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error("❌ OPENROUTER_API_KEY missing in Vercel env.");
        return res.status(500).json({ error: "OPENROUTER_API_KEY missing" });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    let product = null;

    try {
        const { data: pendingProducts, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('blog_status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1);

        if (fetchError) throw fetchError;
        if (!pendingProducts || pendingProducts.length === 0) {
            return res.status(200).json({ message: "No pending blogs to process." });
        }

        product = pendingProducts[0];
        console.log(`Processing blog for: ${product.title}`);

        await supabase.from('products').update({ blog_status: 'processing' }).eq('id', product.id);

        const { data: offers } = await supabase
            .from('affiliate_offers').select('*').eq('product_id', product.id).limit(1);
        const offer = offers?.[0] || { store_name: 'Store', affiliate_url: '#' };

        // ⭐ LATEST FREE MODELS (Updated list) ⭐
        const models = [
            "openrouter/free",
            "openai/gpt-oss-120b:free",
            "google/gemini-2.0-flash-exp:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "deepseek/deepseek-r1:free",
            "mistralai/mistral-7b-instruct:free",
            "google/gemma-2-9b-it:free",
            "meta-llama/llama-3.1-8b-instruct:free",
            "qwen/qwen3-235b-a22b:free",
            "meta-llama/llama-4-scout:free"
        ];

        const prompt = `You are an expert SEO Copywriter. Write a highly detailed, 600-word review blog post in HTML for the following product.
Product: ${product.title}
Description: ${product.description || 'N/A'}
Store: ${offer.store_name}
Link: ${offer.affiliate_url}
Instructions:
- Use HTML tags (<h2>, <h3>, <p>, <ul>, <li>).
- Include a Pros & Cons section.
- Include the affiliate link at least 2 times with text "Check Price on ${offer.store_name}".
- Return ONLY HTML, no markdown code blocks, no extra text.`;

        let generatedContent = null;
        let usedModel = "";
        
        for (const model of models) {
            try {
                console.log(`Trying model: ${model}`);
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
                    signal: AbortSignal.timeout(8000)
                });
                
                const aiData = await response.json();
                
                if (aiData.error) {
                    console.warn(`❌ Model ${model} error: ${aiData.error.message}`);
                    continue; 
                }

                if (aiData.choices && aiData.choices[0]?.message?.content) {
                    generatedContent = aiData.choices[0].message.content
                        .replace(/```html/g, '').replace(/```/g, '').trim();
                    usedModel = model;
                    break;
                }
            } catch (err) { 
                console.warn(`❌ Model ${model} failed/timed out:`, err.message); 
            }
        }

        if (!generatedContent) {
            throw new Error("All AI models failed to generate content. Please try again later.");
        }

        const slug = `${product.slug}-review-${Math.floor(Math.random() * 1000)}`;
        const { error: insertErr } = await supabase.from('blogs').insert([{
            title: `Review: ${product.title} - Is It Worth Buying?`,
            slug: slug,
            content_html: generatedContent,
            image_url: product.image_url,
            is_published: false
        }]);
        
        if (insertErr) throw insertErr;

        await supabase.from('products').update({ blog_status: 'completed' }).eq('id', product.id);

        console.log(`✅ Blog generated successfully using ${usedModel}`);
        return res.status(200).json({ success: true, message: "Blog generated", model: usedModel });

    } catch (err) {
        console.error("🚨 Error in process-queue:", err.message);
        if (product) {
            await supabase.from('products').update({ blog_status: 'pending' }).eq('id', product.id);
        }
        return res.status(500).json({ error: err.message });
    }
};
