// api/process-queue.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    // Security check (Optional: Aap isme ek secret key laga sakte hain agar chahein)
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API key missing" });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        // 1. Check karein koi 'pending' product hai?
        const { data: pendingProducts, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('blog_status', 'pending')
            .limit(1);

        if (fetchError || !pendingProducts || pendingProducts.length === 0) {
            return res.status(200).json({ message: "No pending blogs to process." });
        }

        const product = pendingProducts[0];
        
        // 2. Status ko 'processing' karein taake dobara na uthaye
        await supabase.from('products').update({ blog_status: 'processing' }).eq('id', product.id);

        // 3. Product ki offer details nikaalein
        const { data: offers } = await supabase.from('affiliate_offers').select('*').eq('product_id', product.id).limit(1);
        const offer = offers ? offers[0] : { store_name: 'Store', affiliate_url: '#' };

        // 4. AI ko call karein
        const models = [
            "google/gemini-2.0-flash-lite-preview-02-05:free",
            "meta-llama/llama-3-8b-instruct:free",
            "mistralai/mistral-7b-instruct:free"
        ];

        const prompt = `You are an expert SEO Copywriter. Write a highly detailed, 600-word review blog post for the following product.
        Product: ${product.title}
        Description: ${product.description}
        Store: ${offer.store_name}
        Link: ${offer.affiliate_url}
        Instructions: Use HTML tags (<h2>, <p>, <ul>). Include a Pros & Cons section. Include the link with text "Check Price on ${offer.store_name}". Return ONLY HTML.`;

        let generatedContent = null;

        for (const model of models) {
            try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model: model, messages: [{ role: "user", content: prompt }] })
                });
                const aiData = await response.json();
                if (aiData.choices && aiData.choices[0].message.content) {
                    generatedContent = aiData.choices[0].message.content.replace(/```html/g, '').replace(/```/g, '').trim();
                    break;
                }
            } catch (err) { console.warn("Model failed", err); }
        }

        if (!generatedContent) throw new Error("AI models failed to generate content.");

        // 5. Blog ko Draft mein save karein
        const slug = product.slug + '-review-' + Math.floor(Math.random() * 1000);
        await supabase.from('blogs').insert([{
            title: `Review: ${product.title} - Is It Worth Buying?`,
            slug: slug,
            content_html: generatedContent,
            image_url: product.image_url,
            is_published: false
        }]);

        // 6. Status ko 'completed' karein
        await supabase.from('products').update({ blog_status: 'completed' }).eq('id', product.id);

        return res.status(200).json({ success: true, message: "Blog generated for " + product.title });

    } catch (err) {
        // Agar fail ho jaye, toh status wapis pending karein taake next time try ho
        if (pendingProducts && pendingProducts.length > 0) {
            await supabase.from('products').update({ blog_status: 'pending' }).eq('id', pendingProducts[0].id);
        }
        return res.status(500).json({ error: err.message });
    }
};
