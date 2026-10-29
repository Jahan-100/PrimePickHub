document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabaseClient) return;

    const blogGrid = document.getElementById('blogGrid');
    const artTitle = document.getElementById('artTitle');

    // ⭐ BLOG LIST PAGE LOGIC ⭐
    if (blogGrid) {
        blogGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;">Loading articles...</p>';
        const { data: blogs, error } = await window.supabaseClient.from('blogs').select('*').order('created_at', { ascending: false });
        
        if (error || !blogs || blogs.length === 0) {
            blogGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;">No articles published yet.</p>';
            return;
        }

        blogGrid.innerHTML = blogs.map(b => `
            <a href="/article.html?slug=${b.slug}" class="product-card" style="text-decoration:none;">
                <div class="card-img-wrap" style="height: 180px;">
                    <img src="${b.image_url || '/assets/icon-192.png?v=4'}" alt="${b.title}">
                </div>
                <div class="card-body">
                    <h3 class="card-title" style="font-size: 1.1rem; min-height:auto;">${b.title}</h3>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 10px;">${new Date(b.created_at).toLocaleDateString()}</p>
                    <span style="color: var(--accent); font-weight: bold; font-size: 0.9rem; margin-top: 10px;">Read Article &rarr;</span>
                </div>
            </a>
        `).join('');
    }

    // ⭐ ARTICLE PAGE LOGIC ⭐
    if (artTitle) {
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('slug');
        if (!slug) { window.location.href = '/blog.html'; return; }

        const { data: blog, error } = await window.supabaseClient.from('blogs').select('*').eq('slug', slug).single();
        
        if (error || !blog) {
            artTitle.innerText = "Article Not Found";
            document.getElementById('artContent').innerHTML = "<p>This article might have been removed.</p>";
            return;
        }

        document.title = `${blog.title} - PrimePickHub`;
        artTitle.innerText = blog.title;
        document.getElementById('artDate').innerText = `Published on: ${new Date(blog.created_at).toLocaleDateString()}`;
        
        if (blog.image_url) {
            const img = document.getElementById('artImg');
            img.src = blog.image_url;
            img.style.display = 'block';
        }
        
        // Render HTML content safely
        document.getElementById('artContent').innerHTML = blog.content_html;
    }
});
