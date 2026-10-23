/**
 * PrimePickHub Admin Dashboard — Supabase Auth + Gallery + Video
 */

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof API === 'undefined' || !API.getCurrentUser) {
        alert('API not loaded. Refresh the page.');
        return;
    }

    const auth = await API.getCurrentUser();

    if (!auth) return showLogin();
    if (auth.role !== 'admin') {
        alert('Access denied. Admin only.');
        await API.signOut();
        return showLogin();
    }

    showDashboard();
    await loadStats();
    setupProductForm();
});

function showLogin() {
    const loginContainer = document.getElementById('loginContainer');
    const loginForm = document.getElementById('loginForm');
    const dashEl = document.getElementById('dashboard');
    
    if (loginContainer) loginContainer.style.display = 'block';
    if (dashEl) dashEl.style.display = 'none';

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');

        try {
            await API.signIn(email, password);
            window.location.reload();
        } catch (err) {
            if (errorEl) errorEl.innerText = err.message || 'Login failed';
            else alert('Login failed: ' + err.message);
        }
    });
}

function showDashboard() {
    const loginContainer = document.getElementById('loginContainer');
    const dashEl = document.getElementById('dashboard');
    
    if (loginContainer) loginContainer.style.display = 'none';
    if (dashEl) dashEl.style.display = 'block';
}

async function loadStats() {
    try {
        const stats = await API.getAdminStats();
        const p = document.getElementById('statProducts');
        const c = document.getElementById('statClicks');
        if (p) p.innerText = stats.totalProducts;
        if (c) c.innerText = stats.totalClicks;
    } catch (err) {
        console.warn('Stats error:', err);
    }
}

function setupProductForm() {
    const form = document.getElementById('productForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('pTitle').value.trim();
        const slug = document.getElementById('pSlug').value.trim();
        const img = document.getElementById('pImg').value.trim();
        const galleryText = document.getElementById('pGallery').value.trim();
        const videoUrl = document.getElementById('pVideo').value.trim();
        const category = document.getElementById('pCategory').value;
        const badge = document.getElementById('pBadge').value.trim();
        const rating = document.getElementById('pRating').value ? parseFloat(document.getElementById('pRating').value) : null;
        const reviewsCount = document.getElementById('pReviewsCount').value ? parseInt(document.getElementById('pReviewsCount').value) : 0;
        const store = document.getElementById('pStore').value.trim().toLowerCase();
        const price = parseFloat(document.getElementById('pPrice').value);
        const affUrl = document.getElementById('pAffUrl').value.trim();
        const desc = document.getElementById('pDesc').value.trim();
        const review = document.getElementById('pReview').value.trim();
        const featured = document.getElementById('pFeatured').checked;
        const trending = document.getElementById('pTrending').checked;

        // Gallery: split by newlines, trim, remove empty
        const galleryImages = galleryText 
            ? galleryText.split('\n').map(u => u.trim()).filter(u => u.length > 0)
            : [];

        if (!title || !slug || !img || !store || !price || !affUrl) return alert('Please fill all required fields.');
        if (!/^[a-z0-9-]+$/.test(slug)) return alert('Slug: lowercase letters, numbers, dashes only.');
        if (!/^https?:\/\//i.test(img)) return alert('Primary Image URL must start with http:// or https://');

        try {
            const { data: newProduct, error: prodErr } = await window.supabaseClient
                .from('products')
                .insert([{
                    title, slug, image_url: img, category_slug: category,
                    description: desc, review_html: review,
                    is_featured: featured, is_trending: trending,
                    badge: badge || null,
                    rating: rating,
                    reviews_count: reviewsCount,
                    gallery_images: galleryImages,
                    video_url: videoUrl || null
                }]).select().single();

            if (prodErr) throw prodErr;

            const { error: offErr } = await window.supabaseClient
                .from('affiliate_offers')
                .insert([{
                    product_id: newProduct.id,
                    store_name: store,
                    price: price,
                    affiliate_url: affUrl
                }]);

            if (offErr) throw offErr;

            alert(`"${title}" saved successfully!\n\nGallery Images: ${galleryImages.length}\nVideo: ${videoUrl ? 'Yes' : 'No'}`);
            form.reset();
            await loadStats();
        } catch (err) {
            alert('Save error: ' + (err.message || 'Check RLS policies.'));
        }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await API.signOut();
        window.location.reload();
    });
}
