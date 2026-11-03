// api/process-queue.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    // 1. Check for Vercel CRON secret (Optional, for security)
    if (process.env.CRON_SECRET) {
        const auth = req.headers.authorization || '';
        if (auth !== `Bearer ${process.env.CRON_SECRET}` && req.headers['x-vercel-cron'] !== '1') {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY missing in Vercel" });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    let product = null;

    try {
        // 2. Fetch one pending product
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

        // 3. Mark as processing so it doesn't get picked up twice
        await supabase.from('products').update({ blog_status: 'processing' }).eq('id', product.id);

        // 4. Get store details
        const { data: offers } = await supabase
            .from('affiliate_offers').select('*').eq('product_id', product.id).limit(1);
        const offer = offers?.[0] || { store_name: 'Store', affiliate_url: '#' };

        // 5. AI Models (Updated fallback list)
        const models = [
            "google/gemini-2.0-flash-lite-preview-02-05:free",
            "meta-llama/llama-3-8b-instruct:free",
            "mistralai/mistral-7b-instruct:free",
            "huggingfaceh4/zephyr-7b-beta:free"
        ];

        // 6. The Prompt
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

        // 7. Generate Content
        let generatedContent = null;
        let usedModel = "";
        for (const model of models) {
            try {
                console.log(`Trying AI model: ${model}`);
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] })
                });
                const aiData = await response.json();
                
                if (aiData.error) {
                    console.warn(`Model ${model} failed: ${aiData.error.message}`);
                    continue;
                }

                if (aiData.choices && aiData.choices[0].message.content) {
                    generatedContent = aiData.choices[0].message.content
                        .replace(/```html/g, '').replace(/```/g, '').trim();
                    usedModel = model;
                    break;
                }
            } catch (err) { 
                console.warn("Model failed:", model, err.message); 
            }
        }

        if (!generatedContent) throw new Error("All AI models failed to generate content.");

        // 8. Save Blog as Draft (is_published: false)
        const slug = `${product.slug}-review-${Math.floor(Math.random() * 1000)}`;
        const { error: insertErr } = await supabase.from('blogs').insert([{
            title: `Review: ${product.title} - Is It Worth Buying?`,
            slug: slug,
            content_html: generatedContent,
            image_url: product.image_url,
            is_published: false 
        }]);
        
        if (insertErr) throw insertErr;

        // 9. Mark as completed
        await supabase.from('products').update({ blog_status: 'completed' }).eq('id', product.id);

        return res.status(200).json({ success: true, message: "Blog generated for: " + product.title, model: usedModel });

    } catch (err) {
        if (product) {
            await supabase.from('products').update({ blog_status: 'pending' }).eq('id', product.id);
        }
        return res.status(500).json({ error: err.message });
    }
};
