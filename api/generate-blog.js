// api/generate-blog.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { productId, title, description, storeName, affiliateUrl, imageUrl } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY missing in Vercel" });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // ⭐ FREE & RELIABLE AI MODELS (Fallback ke sath) ⭐
    const models = [
        "google/gemini-2.0-flash-lite-preview-02-05:free",
        "meta-llama/llama-3-8b-instruct:free",
        "mistralai/mistral-7b-instruct:free",
        "huggingfaceh4/zephyr-7b-beta:free"
    ];

    const prompt = `You are an expert SEO Copywriter. Write a highly detailed, 600-word review blog post for the following product to help it rank on Google.
    
    Product Details:
    - Title: ${title}
    - Description: ${description}
    - Store: ${storeName}
    - Affiliate Link: ${affiliateUrl}
    - Image: ${imageUrl}
    
    Instructions:
    1. Use HTML tags like <h2>, <h3>, <p>, <ul>, <li>.
    2. Use an engaging tone.
    3. Include a "Pros & Cons" section.
    4. Include the affiliate link at least 2 times with text "Check Price on ${storeName}".
    5. Return ONLY the HTML content, no markdown blocks, no extra text.`;

    let generatedContent = null;
    let usedModel = "";

    for (const model of models) {
        try {
            console.log(`Trying AI Model: ${model}`);
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: prompt }]
                })
            });

            const aiData = await response.json();
            if (aiData.choices && aiData.choices[0].message.content) {
                generatedContent = aiData.choices[0].message.content;
                usedModel = model;
                break; // Agar success ho gaya toh loop rok dein
            }
        } catch (err) {
            console.warn(`Model ${model} failed, trying next...`);
        }
    }

    if (!generatedContent) {
        return res.status(500).json({ error: "All AI models failed. Please try again later." });
    }

    // AI ke output ko clean karein
    const cleanContent = generatedContent.replace(/```html/g, '').replace(/```/g, '').trim();

    try {
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(Math.random() * 1000);
        
        const { data: newBlog, error } = await supabase.from('blogs').insert([{
            title: `Review: ${title} - Is It Worth Buying?`,
            slug: slug,
            content_html: cleanContent,
            image_url: imageUrl,
            is_published: false // ⭐ DRAFT MODE ⭐
        }]).select().single();

        if (error) throw error;

        return res.status(200).json({ success: true, message: "Draft Blog Generated", model: usedModel });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
