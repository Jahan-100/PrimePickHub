/**
 * PrimePickHub Admin Dashboard with Commission & Variations
 */

let allProducts = [];

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
    await loadProductsList();
    setupProductForm();
    setupToggleList(); // ⭐ Toggle Button Setup
    
    document.getElementById('adminCategoryFilter')?.addEventListener('change', renderTable);
    document.getElementById('adminSearchInput')?.addEventListener('input', renderTable);
});

// ⭐ Show / Hide Product List Toggle Logic
function setupToggleList() {
    const toggleBtn = document.getElementById('toggleProductListBtn');
    const listContainer = document.getElementById('productListContainer');

    if (toggleBtn && listContainer) {
        toggleBtn.addEventListener('click', () => {
            if (listContainer.style.display === 'none') {
                listContainer.style.display = 'block';
                toggleBtn.textContent = 'Hide Product List';
                toggleBtn.style.background = '#EF4444'; // Red for hide
            } else {
                listContainer.style.display = 'none';
                toggleBtn.textContent = 'Show Product List';
                toggleBtn.style.background = '#3B82F6'; // Blue for show
            }
        });
    }
}

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

async function loadProductsList() {
    const tbody = document.getElementById('productListBody');
    if (!tbody) return;

    try {
        const { data: products, error } = await window.supabaseClient
            .from('products')
            .select('*, affiliate_offers(*)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allProducts = products || [];
        
        const categoryFilter = document.getElementById('adminCategoryFilter');
        if (categoryFilter) {
            const defaultCats = ['electronics', 'fashion', 'home-kitchen', 'beauty', 'sports'];
            const dbCats = [...new Set(allProducts.map(p => p.category_slug).filter(Boolean))];
            const allCats = [...new Set([...defaultCats, ...dbCats])];
            
            categoryFilter.innerHTML = `<option value="all">All Categories</option>` + 
                allCats.map(c => `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}</option>`).join('');
        }

        const addCategorySelect = document.getElementById('pCategory');
        if (addCategorySelect) {
            const defaultCats = ['electronics', 'fashion', 'home-kitchen', 'beauty', 'sports'];
            const dbCats = [...new Set(allProducts.map(p => p.category_slug).filter(Boolean))];
            const allCats = [...new Set([...defaultCats, ...dbCats])];
            
            addCategorySelect.innerHTML = allCats.map(c => 
                `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}</option>`
            ).join('');
        }

        renderTable();

    } catch (err) {
        console.error('List Load Error:', err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:red;">Failed to load products.</td></tr>';
    }
}

function renderTable() {
    const tbody = document.getElementById('productListBody');
    if (!tbody) return;

    const categoryFilter = document.getElementById('adminCategoryFilter')?.value || 'all';
    const searchQuery = document.getElementById('adminSearchInput')?.value.toLowerCase().trim() || '';

    const filteredProducts = allProducts.filter(p => {
        const matchesCategory = categoryFilter === 'all' || p.category_slug === categoryFilter;
        const matchesSearch = p.title.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });

    if (filteredProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No products found matching your criteria.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredProducts.map(p => {
        const defaultOffer = p.affiliate_offers?.find(o => !o.variation_name) || p.affiliate_offers?.[0] || {};
        const basePrice = parseFloat(defaultOffer.price) || 0;
        const commissionRate = parseFloat(defaultOffer.commission_rate) || 0;
        
        const finalPrice = commissionRate > 0 
            ? basePrice + (basePrice * (commissionRate / 100)) 
            : basePrice;
        
        const priceStr = defaultOffer.price ? `${finalPrice.toFixed(2)} ${defaultOffer.currency || 'USD'}` : 'N/A';

        return `
            <tr>
                <td><img src="${p.image_url}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;"></td>
                <td>${p.title}</td>
                <td><strong style="color:#FF5A3C;">${priceStr}</strong></td>
                <td>
                    <button class="btn-edit" onclick="editProduct('${p.id}')">Edit</button>
                    <button class="btn-delete" onclick="deleteProduct('${p.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

window.addVariationRow = function(name = '', price = '', commission = '', url = '') {
    const container = document.getElementById('variationsContainer');
    const div = document.createElement('div');
    div.className = 'variation-row';
    div.innerHTML = `
        <input type="text" placeholder="Size/Color (e.g. M, L, Red)" value="${name}" class="var-name" required>
        <input type="number" step="0.01" placeholder="Price" value="${price}" class="var-price" required>
        <input type="number" step="0.1" placeholder="Comm % (Optional)" value="${commission}" class="var-comm">
        <input type="url" placeholder="Affiliate URL (Optional)" value="${url}" class="var-url">
        <button type="button" class="btn-remove-var" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(div);
}

document.getElementById('addVariationBtn')?.addEventListener('click', () => addVariationRow());

window.editProduct = async function(id) {
    try {
        const { data: p, error } = await window.supabaseClient
            .from('products')
            .select('*, affiliate_offers(*)')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        const defaultOffer = p.affiliate_offers?.find(o => !o.variation_name) || p.affiliate_offers?.[0] || {};
        
        document.getElementById('pId').value = p.id;
        document.getElementById('pOfferId').value = defaultOffer.id || '';
        document.getElementById('pTitle').value = p.title || '';
        document.getElementById('pSlug').value = p.slug || '';
        document.getElementById('pImg').value = p.image_url || '';
        document.getElementById('pGallery').value = (p.gallery_images || []).join('\n');
        document.getElementById('pVideo').value = p.video_url || '';
        document.getElementById('pCategory').value = p.category_slug || 'electronics';
        document.getElementById('pBadge').value = p.badge || '';
        document.getElementById('pRating').value = p.rating || '';
        document.getElementById('pReviewsCount').value = p.reviews_count || 0;
        
        document.getElementById('pStore').value = defaultOffer.store_name || '';
        document.getElementById('pPrice').value = defaultOffer.price || '';
        document.getElementById('pCommission').value = (defaultOffer.commission_rate && defaultOffer.commission_rate > 0) ? defaultOffer.commission_rate : '';
        document.getElementById('pCurrency').value = defaultOffer.currency || 'USD';
        document.getElementById('pAffUrl').value = defaultOffer.affiliate_url || '';
        
        document.getElementById('pDesc').value = p.description || '';
        document.getElementById('pReview').value = p.review_html || '';
        document.getElementById('pFeatured').checked = p.is_featured || false;
        document.getElementById('pTrending').checked = p.is_trending || false;

        const varContainer = document.getElementById('variationsContainer');
        varContainer.innerHTML = '';
        
        const variations = p.affiliate_offers?.filter(o => o.variation_name) || [];
        variations.forEach(v => {
            const commVal = (v.commission_rate && v.commission_rate > 0) ? v.commission_rate : '';
            addVariationRow(v.variation_name, v.price, commVal, v.affiliate_url);
        });

        document.getElementById('formTitle').innerText = "Edit Product";
        document.getElementById('saveBtn').innerText = "Update Product";
        document.getElementById('cancelEditBtn').style.display = "block";
        
        // Open the list if it's closed
        const listContainer = document.getElementById('productListContainer');
        if(listContainer && listContainer.style.display === 'none') {
            document.getElementById('toggleProductListBtn').click();
        }
        
        document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        alert("Error loading product: " + err.message);
    }
}

window.deleteProduct = async function(id) {
    if (!confirm("Are you sure you want to delete this product? This cannot be undone.")) return;

    try {
        const { error } = await window.supabaseClient.from('products').delete().eq('id', id);
        if (error) throw error;
        alert("Product deleted successfully!");
        await loadStats();
        await loadProductsList();
    } catch (err) {
        alert("Error deleting product: " + err.message);
    }
}

function setupProductForm() {
    const form = document.getElementById('productForm');
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (!form) return;

    cancelBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('variationsContainer').innerHTML = '';
        document.getElementById('pId').value = '';
        document.getElementById('pOfferId').value = '';
        document.getElementById('formTitle').innerText = "Add New Product";
        document.getElementById('saveBtn').innerText = "Save Product";
        cancelBtn.style.display = "none";
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('pId').value;
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
        const price = parseFloat(document.getElementById('pPrice').value) || 0;
        
        const commInput = document.getElementById('pCommission').value.trim();
        const commission = commInput === '' ? 0 : (parseFloat(commInput) || 0);
        
        const currency = document.getElementById('pCurrency').value;
        const affUrl = document.getElementById('pAffUrl').value.trim();
        
        const desc = document.getElementById('pDesc').value.trim();
        const review = document.getElementById('pReview').value.trim();
        const featured = document.getElementById('pFeatured').checked;
        const trending = document.getElementById('pTrending').checked;

        const galleryImages = galleryText ? galleryText.split('\n').map(u => u.trim()).filter(u => u.length > 0) : [];

        if (!title || !slug || !img || !store || !affUrl) return alert('Please fill all required fields.');

        const productData = {
            title, slug, image_url: img, category_slug: category,
            description: desc, review_html: review,
            is_featured: featured, is_trending: trending,
            badge: badge || null, rating: rating, reviews_count: reviewsCount,
            gallery_images: galleryImages, video_url: videoUrl || null
        };

        const mainOfferData = {
            store_name: store,
            price: price,
            commission_rate: commission,
            currency: currency,
            affiliate_url: affUrl,
            variation_name: null
        };

        const variations = [];
        document.querySelectorAll('.variation-row').forEach(row => {
            const vName = row.querySelector('.var-name').value.trim();
            const vPrice = parseFloat(row.querySelector('.var-price').value);
            const vCommInput = row.querySelector('.var-comm').value.trim();
            const vComm = vCommInput === '' ? commission : (parseFloat(vCommInput) || 0);
            const vUrl = row.querySelector('.var-url').value.trim() || affUrl;

            if (vName && !isNaN(vPrice)) {
                variations.push({
                    store_name: store,
                    price: vPrice,
                    commission_rate: vComm,
                    currency: currency,
                    affiliate_url: vUrl,
                    variation_name: vName
                });
            }
        });

        try {
            let productId = id;

            if (isEditing) {
                const { error: prodErr } = await window.supabaseClient.from('products').update(productData).eq('id', id);
                if (prodErr) throw prodErr;
                
                await window.supabaseClient.from('affiliate_offers').delete().eq('product_id', id);
            } else {
                const { data: newProduct, error: prodErr } = await window.supabaseClient.from('products').insert([productData]).select().single();
                if (prodErr) throw prodErr;
                productId = newProduct.id;
            }

            if (price > 0 || variations.length === 0) {
                mainOfferData.product_id = productId;
                await window.supabaseClient.from('affiliate_offers').insert([mainOfferData]);
            }

            if (variations.length > 0) {
                variations.forEach(v => v.product_id = productId);
                const { error: varErr } = await window.supabaseClient.from('affiliate_offers').insert(variations);
                if (varErr) throw varErr;
            }

            alert(`"${title}" saved successfully!`);
            form.reset();
            document.getElementById('variationsContainer').innerHTML = '';
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
