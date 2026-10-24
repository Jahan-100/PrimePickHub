/**
 * PrimePickHub Admin Dashboard with Add, Edit, Delete
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
    await loadProductsList(); // Product List Load karein
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

// ⭐ Product List Load Karein
async function loadProductsList() {
    const tbody = document.getElementById('productListBody');
    if (!tbody) return;

    try {
        const { data: products, error } = await window.supabaseClient
            .from('products')
            .select('*, affiliate_offers(*)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!products || products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No products yet. Add one!</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(p => {
            const offer = p.affiliate_offers?.[0] || {};
            const priceStr = `${offer.price || 0} ${offer.currency || 'USD'}`;
            return `
                <tr>
                    <td><img src="${p.image_url}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;"></td>
                    <td>${p.title}</td>
                    <td>${priceStr}</td>
                    <td>
                        <button class="btn-edit" onclick="editProduct('${p.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteProduct('${p.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('List Load Error:', err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:red;">Failed to load products.</td></tr>';
    }
}

// ⭐ Edit Function (Global Scope so onclick can access it)
window.editProduct = async function(id) {
    try {
        const { data: p, error } = await window.supabaseClient
            .from('products')
            .select('*, affiliate_offers(*)')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        const offer = p.affiliate_offers?.[0] || {};

        // Fill Form
        document.getElementById('pId').value = p.id;
        document.getElementById('pOfferId').value = offer.id || '';
        document.getElementById('pTitle').value = p.title || '';
        document.getElementById('pSlug').value = p.slug || '';
        document.getElementById('pImg').value = p.image_url || '';
        document.getElementById('pGallery').value = (p.gallery_images || []).join('\n');
        document.getElementById('pVideo').value = p.video_url || '';
        document.getElementById('pCategory').value = p.category_slug || 'electronics';
        document.getElementById('pBadge').value = p.badge || '';
        document.getElementById('pRating').value = p.rating || '';
        document.getElementById('pReviewsCount').value = p.reviews_count || 0;
        
        document.getElementById('pStore').value = offer.store_name || '';
        document.getElementById('pPrice').value = offer.price || '';
        document.getElementById('pCurrency').value = offer.currency || 'USD';
        document.getElementById('pAffUrl').value = offer.affiliate_url || '';
        
        document.getElementById('pDesc').value = p.description || '';
        document.getElementById('pReview').value = p.review_html || '';
        document.getElementById('pFeatured').checked = p.is_featured || false;
        document.getElementById('pTrending').checked = p.is_trending || false;

        // Change UI
        document.getElementById('formTitle').innerText = "Edit Product";
        document.getElementById('saveBtn').innerText = "Update Product";
        document.getElementById('cancelEditBtn').style.display = "block";
        
        // Scroll to form
        document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        alert("Error loading product: " + err.message);
    }
}

// ⭐ Delete Function
window.deleteProduct = async function(id) {
    if (!confirm("Are you sure you want to delete this product? This cannot be undone.")) return;

    try {
        const { error } = await window.supabaseClient
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        alert("Product deleted successfully!");
        await loadStats();
        await loadProductsList();
    } catch (err) {
        alert("Error deleting product: " + err.message);
    }
}

// ⭐ Add / Edit Form Submit
function setupProductForm() {
    const form = document.getElementById('productForm');
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (!form) return;

    // Cancel Edit Button
    cancelBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('pId').value = '';
        document.getElementById('pOfferId').value = '';
        document.getElementById('formTitle').innerText = "Add New Product";
        document.getElementById('saveBtn').innerText = "Save Product";
        cancelBtn.style.display = "none";
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('pId').value;
        const offerId = document.getElementById('pOfferId').value;
        const isEditing = id !== '';

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
        const currency = document.getElementById('pCurrency').value;
        const affUrl = document.getElementById('pAffUrl').value.trim();
        
        const desc = document.getElementById('pDesc').value.trim();
        const review = document.getElementById('pReview').value.trim();
        const featured = document.getElementById('pFeatured').checked;
        const trending = document.getElementById('pTrending').checked;

        const galleryImages = galleryText ? galleryText.split('\n').map(u => u.trim()).filter(u => u.length > 0) : [];

        if (!title || !slug || !img || !store || !price || !affUrl) return alert('Please fill all required fields.');

        const productData = {
            title, slug, image_url: img, category_slug: category,
            description: desc, review_html: review,
            is_featured: featured, is_trending: trending,
            badge: badge || null, rating: rating, reviews_count: reviewsCount,
            gallery_images: galleryImages, video_url: videoUrl || null
        };

        const offerData = {
            store_name: store,
            price: price,
            currency: currency,
            affiliate_url: affUrl
        };

        try {
            if (isEditing) {
                // UPDATE
                const { error: prodErr } = await window.supabaseClient.from('products').update(productData).eq('id', id);
                if (prodErr) throw prodErr;

                if (offerId) {
                    const { error: offErr } = await window.supabaseClient.from('affiliate_offers').update(offerData).eq('id', offerId);
                    if (offErr) throw offErr;
                } else {
                    offerData.product_id = id;
                    await window.supabaseClient.from('affiliate_offers').insert([offerData]);
                }
                alert(`"${title}" updated successfully!`);
            } else {
                // INSERT
                const { data: newProduct, error: prodErr } = await window.supabaseClient.from('products').insert([productData]).select().single();
                if (prodErr) throw prodErr;

                offerData.product_id = newProduct.id;
                const { error: offErr } = await window.supabaseClient.from('affiliate_offers').insert([offerData]);
                if (offErr) throw offErr;
                
                alert(`"${title}" saved successfully!`);
            }

            form.reset();
            document.getElementById('pId').value = '';
            document.getElementById('formTitle').innerText = "Add New Product";
            document.getElementById('saveBtn').innerText = "Save Product";
            cancelBtn.style.display = "none";
            
            await loadStats();
            await loadProductsList();

        } catch (err) {
            alert('Save error: ' + (err.message || 'Check RLS policies.'));
        }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await API.signOut();
        window.location.reload();
    });
}
