document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabaseClient) return;

    const blogGrid = document.getElementById('blogGrid');
    const artTitle = document.getElementById('artTitle');

    // ⭐ BLOG LIST PAGE (Using Clean URLs) ⭐
    if (blogGrid) {
        blogGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;">Loading articles...</p>';
        const { data: blogs, error } = await window.supabaseClient.from('blogs').select('*').eq('is_published', true).order('created_at', { ascending: false });
        
        if (error || !blogs || blogs.length === 0) { blogGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;">No articles published yet.</p>'; return; }

        blogGrid.innerHTML = blogs.map(b => `
            <a href="/blog/${b.slug}" class="product-card" style="text-decoration:none;">
                <div class="card-img-wrap" style="height: 180px;"><img src="${b.image_url || '/assets/icon-192.png?v=4'}" alt="${b.title}"></div>
                <div class="card-body">
                    <h3 class="card-title" style="font-size: 1.1rem; min-height:auto;">${b.title}</h3>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 10px;">${new Date(b.created_at).toLocaleDateString()}</p>
                    <span style="color: var(--accent); font-weight: bold; font-size: 0.9rem; margin-top: 10px;">Read Article &rarr;</span>
                </div>
            </a>
        `).join('');
    }

    // ⭐ ARTICLE PAGE (Meta Tags + Schema Injection) ⭐
    if (artTitle) {
        const params = new URLSearchParams(window.location.search);
        const path = window.location.pathname;
        
        let slug = params.get('slug');
        
        // ⭐ FIX: Agar URL /blog/slug-name jaisa hai toh path se slug nikaalein ⭐
        if (!slug && path.includes('/blog/')) {
            slug = path.split('/blog/')[1].split('/')[0];
        }
        // Fallback for old /article.html?slug=... format
        if (!slug && path.includes('article.html')) {
            slug = params.get('slug');
        }

        if (!slug) { 
            document.getElementById('artContent').innerHTML = "<p>Article not found. <a href='/blog.html'>Return to Blog</a></p>";
            return; 
        }

        const { data: blog, error } = await window.supabaseClient.from('blogs').select('*').eq('slug', slug).eq('is_published', true).single();
        
        if (error || !blog) {
            artTitle.innerText = "Article Not Found or Not Published";
            document.getElementById('artContent').innerHTML = "<p>This article might have been removed or is still a draft.</p>";
            return;
        }

        const finalTitle = `${blog.title} - PrimePickHub`;
        document.title = finalTitle;
        artTitle.innerText = blog.title;
        document.getElementById('artDate').innerText = `Published on: ${new Date(blog.created_at).toLocaleDateString()}`;
        
        // ⭐ Meta Tags Update for Social Sharing ⭐
        if (document.getElementById('ogTitle')) document.getElementById('ogTitle').content = finalTitle;
        if (document.getElementById('metaDesc')) document.getElementById('metaDesc').content = `Read our review: ${blog.title}. Detailed analysis and buying guide on PrimePickHub.`;
        if (document.getElementById('ogDesc')) document.getElementById('ogDesc').content = `Read our review: ${blog.title}. Detailed analysis and buying guide on PrimePickHub.`;
        
        if (blog.image_url) {
            const img = document.getElementById('artImg');
            img.src = blog.image_url;
            img.style.display = 'block';
            if (document.getElementById('ogImg')) document.getElementById('ogImg').content = blog.image_url;
        }
        
        document.getElementById('artContent').innerHTML = blog.content_html;

        // ⭐ Article Schema Injection ⭐
        const articleSchema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": blog.title,
            "image": [blog.image_url || "https://primepickhub.vercel.app/assets/icon-512.png"],
            "datePublished": new Date(blog.created_at).toISOString(),
            "dateModified": new Date(blog.created_at).toISOString(),
            "author": { "@type": "Organization", "name": "PrimePickHub Editorial Team" },
            "publisher": { "@type": "Organization", "name": "PrimePickHub", "logo": { "@type": "ImageObject", "url": "https://primepickhub.vercel.app/assets/icon-512.png" } }
        };
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(articleSchema);
        document.head.appendChild(script);
    }
});
