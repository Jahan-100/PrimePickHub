let allProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof API === 'undefined' || !API.getCurrentUser) { alert('API not loaded. Refresh the page.'); return; }
    const auth = await API.getCurrentUser();
    if (!auth) return showLogin();
    if (auth.role !== 'admin') { alert('Access denied. Admin only.'); await API.signOut(); return showLogin(); }

    showDashboard(); 
    await loadStats(); 
    await loadSpecialSettings(); 
    await loadProductsList(); 
    setupProductForm(); 
    setupToggleList();
    
    document.getElementById('adminCategoryFilter')?.addEventListener('change', renderTable);
    document.getElementById('adminSearchInput')?.addEventListener('input', renderTable);
    
    // Special Deal Settings Save Button
    document.getElementById('saveTitleBtn')?.addEventListener('click', async function() {
        const newTitle = document.getElementById('specialDealTitleInput').value.trim();
        const fontFamily = document.getElementById('titleFontFamily').value;
        const fontSize = document.getElementById('titleFontSize').value.trim() || '2.2rem';
        const fontWeight = document.getElementById('titleFontWeight').value;
        const fontStyle = document.getElementById('titleFontStyle').value;

        if(!newTitle) return alert("Title cannot be empty");
        
        const { error } = await window.supabaseClient.from('site_settings').update({ 
            special_deal_title: newTitle,
            title_font_family: fontFamily,
            title_font_size: fontSize,
            title_font_weight: fontWeight,
            title_font_style: fontStyle
        }).eq('id', 1);

        if (error) alert("Error: " + error.message);
        else alert("Homepage Special Deal Design updated successfully!");
    });

    document.getElementById('checkAvailabilityBtn')?.addEventListener('click', async function() {
        const btn = this;
        const originalText = btn.innerText;
        btn.innerText = "Checking... Please Wait (1-2 mins)";
        btn.disabled = true;
        try {
            const res = await fetch('/api/check-status');
            const data = await res.json();
            if (data.success) {
                alert(`Check Complete!\n${data.message}`);
                await loadProductsList(); 
            } else { alert('Error checking status: ' + (data.error || 'Unknown error')); }
        } catch (err) { alert('Failed to check. Make sure Vercel API is deployed.'); }
        finally { btn.innerText = originalText; btn.disabled = false; }
    });
});

async function loadSpecialSettings() {
    const { data } = await window.supabaseClient.from('site_settings').select('*').eq('id', 1).single();
    if (data) {
        if(document.getElementById('specialDealTitleInput')) {
            document.getElementById('specialDealTitleInput').value = data.special_deal_title || 'Must Watch Deals';
            document.getElementById('titleFontFamily').value = data.title_font_family || 'Poppins';
            document.getElementById('titleFontSize').value = data.title_font_size || '2.2rem';
            document.getElementById('titleFontWeight').value = data.title_font_weight || '800';
            document.getElementById('titleFontStyle').value = data.title_font_style || 'normal';
        }
    }
}

function setupToggleList() {
    const toggleBtn = document.getElementById('toggleProductListBtn');
    const listContainer = document.getElementById('productListContainer');
    if (toggleBtn && listContainer) {
        toggleBtn.addEventListener('click', () => {
            if (listContainer.style.display === 'none') {
                listContainer.style.display = 'block'; toggleBtn.textContent = 'Hide Product List'; toggleBtn.style.background = '#EF4444';
            } else {
                listContainer.style.display = 'none'; toggleBtn.textContent = 'Show Product List'; toggleBtn.style.background = '#3B82F6';
            }
        });
    }
}

function showLogin() {
    const loginContainer = document.getElementById('loginContainer'); const loginForm = document.getElementById('loginForm'); const dashEl = document.getElementById('dashboard');
    if (loginContainer) loginContainer.style.display = 'block'; if (dashEl) dashEl.style.display = 'none';
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim(); const password = document.getElementById('loginPassword').value; const errorEl = document.getElementById('loginError');
        try { await API.signIn(email, password); window.location.reload(); } catch (err) { if (errorEl) errorEl.innerText = err.message || 'Login failed'; else alert('Login failed: ' + err.message); }
    });
}

function showDashboard() {
    const loginContainer = document.getElementById('loginContainer'); const dashEl = document.getElementById('dashboard');
    if (loginContainer) loginContainer.style.display = 'none'; if (dashEl) dashEl.style.display = 'block';
}

async function loadStats() {
    try {
        const stats = await API.getAdminStats(); const p = document.getElementById('statProducts'); const c = document.getElementById('statClicks');
        if (p) p.innerText = stats.totalProducts; if (c) c.innerText = stats.totalClicks;
    } catch (err) { console.warn('Stats error:', err); }
}

async function loadProductsList() {
    const tbody = document.getElementById('productListBody'); if (!tbody) return;
    try {
        const { data: products, error } = await window.supabaseClient.from('products').select('*, affiliate_offers(*)').order('created_at', { ascending: false });
        if (error) throw error;
        allProducts = products || [];
        
        const categoryFilter = document.getElementById('adminCategoryFilter');
        if (categoryFilter) {
            const defaultCats = ['electronics', 'fashion', 'home-kitchen', 'beauty', 'sports'];
            const dbCats = [...new Set(allProducts.map(p => p.category_slug).filter(Boolean))];
            const allCats = [...new Set([...defaultCats, ...dbCats])];
            categoryFilter.innerHTML = `<option value="all">All Categories</option>` + allCats.map(c => `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}</option>`).join('');
        }

        const addCategorySelect = document.getElementById('pCategory');
        if (addCategorySelect) {
            const defaultCats = ['electronics', 'fashion', 'home-kitchen', 'beauty', 'sports'];
            const dbCats = [...new Set(allProducts.map(p => p.category_slug).filter(Boolean))];
            const allCats = [...new Set([...defaultCats, ...dbCats])];
            addCategorySelect.innerHTML = allCats.map(c => `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}</option>`).join('');
        }
        renderTable();
    } catch (err) { console.error('List Load Error:', err); tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:red;">Failed to load products.</td></tr>'; }
}

function renderTable() {
    const tbody = document.getElementById('productListBody'); if (!tbody) return;
    const categoryFilter = document.getElementById('adminCategoryFilter')?.value || 'all';
    const searchQuery = document.getElementById('adminSearchInput')?.value.toLowerCase().trim() || '';

    let filteredProducts = allProducts.filter(p => {
        const matchesCategory = categoryFilter === 'all' || p.category_slug === categoryFilter;
        const matchesSearch = p.title.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });

    filteredProducts.sort((a, b) => {
        const aIsAvailable = a.is_available !== false; const bIsAvailable = b.is_available !== false;
        if (aIsAvailable === bIsAvailable) return 0; return aIsAvailable ? 1 : -1;
    });

    if (filteredProducts.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No products found.</td></tr>'; return; }

    tbody.innerHTML = filteredProducts.map(p => {
        const defaultOffer = p.affiliate_offers?.find(o => !o.variation_name) || p.affiliate_offers?.[0] || {};
        const basePrice = parseFloat(defaultOffer.price) || 0;
        const commissionRate = parseFloat(defaultOffer.commission_rate) || 0;
        const now = new Date(); const isSaleActive = p.sale_end_date && new Date(p.sale_end_date) > now;
        const salePrice = parseFloat(defaultOffer.sale_price) || 0;
        let finalPrice = basePrice;
        if (isSaleActive && salePrice > 0) { finalPrice = commissionRate > 0 ? salePrice + (salePrice * (commissionRate / 100)) : salePrice; } 
        else { finalPrice = commissionRate > 0 ? basePrice + (basePrice * (commissionRate / 100)) : basePrice; }
        const priceStr = defaultOffer.price ? `${finalPrice.toFixed(2)} ${defaultOffer.currency || 'USD'}` : 'N/A';
        
        const isAvailable = p.is_available !== false;
        const rowClass = isAvailable ? '' : 'unavailable-row';
        const statusBadge = isAvailable ? '' : `<span class="badge-unavailable">UNAVAILABLE</span>`;

        return `
            <tr class="${rowClass}">
                <td><img src="${p.image_url}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;"></td>
                <td>${p.title} ${statusBadge}</td>
                <td><strong style="color:#FF5A3C;">${priceStr}</strong></td>
                <td>
                    <button class="btn-edit" onclick="editProduct('${p.id}')">Edit</button>
                    <button class="btn-delete" onclick="deleteProduct('${p.id}')">Delete</button>
                </td>
            </tr>`;
    }).join('');
}

window.addVariationRow = function(name = '', price = '', salePrice = '', commission = '', url = '') {
    const container = document.getElementById('variationsContainer');
    const div = document.createElement('div');
    div.className = 'variation-row';
    div.innerHTML = `
        <input type="text" placeholder="Size/Color" value="${name}" class="var-name" required>
        <input type="number" step="0.01" placeholder="Base Price" value="${price}" class="var-price" required>
        <input type="number" step="0.01" placeholder="Sale Price" value="${salePrice}" class="var-sale-price">
        <input type="number" step="0.1" placeholder="Comm %" value="${commission}" class="var-comm">
        <input type="url" placeholder="Aff URL" value="${url}" class="var-url">
        <button type="button" class="btn-remove-var" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(div);
}
document.getElementById('addVariationBtn')?.addEventListener('click', () => addVariationRow());

window.editProduct = async function(id) {
    try {
        const { data: p, error } = await window.supabaseClient.from('products').select('*, affiliate_offers(*)').eq('id', id).single();
        if (error) throw error;
        const defaultOffer = p.affiliate_offers?.find(o => !o.variation_name) || p.affiliate_offers?.[0] || {};
        
        document.getElementById('pId').value = p.id; document.getElementById('pOfferId').value = defaultOffer.id || '';
        document.getElementById('pTitle').value = p.title || ''; document.getElementById('pSlug').value = p.slug || '';
        document.getElementById('pImg').value = p.image_url || ''; document.getElementById('pGallery').value = (p.gallery_images || []).join('\n');
        document.getElementById('pVideo').value = p.video_url || ''; document.getElementById('pCategory').value = p.category_slug || 'electronics';
        document.getElementById('pBadge').value = p.badge || ''; document.getElementById('pRating').value = p.rating || ''; document.getElementById('pReviewsCount').value = p.reviews_count || 0;
        
        document.getElementById('pEventName').value = p.event_name || '';
        if(p.sale_end_date) {
            const d = new Date(p.sale_end_date); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            document.getElementById('pSaleEndDate').value = d.toISOString().slice(0,16);
        } else { document.getElementById('pSaleEndDate').value = ''; }

        document.getElementById('pStore').value = defaultOffer.store_name || ''; 
        document.getElementById('pPrice').value = defaultOffer.price || '';
        document.getElementById('pSalePrice').value = defaultOffer.sale_price || '';
        document.getElementById('pCommission').value = (defaultOffer.commission_rate && defaultOffer.commission_rate > 0) ? defaultOffer.commission_rate : '';
        document.getElementById('pCurrency').value = defaultOffer.currency || 'USD'; document.getElementById('pAffUrl').value = defaultOffer.affiliate_url || '';
        
        document.getElementById('pDesc').value = p.description || ''; document.getElementById('pReview').value = p.review_html || '';
        document.getElementById('pFeatured').checked = p.is_featured || false; document.getElementById('pTrending').checked = p.is_trending || false;
        document.getElementById('pSpecialDeal').checked = p.is_special_deal || false;

        const varContainer = document.getElementById('variationsContainer'); varContainer.innerHTML = '';
        const variations = p.affiliate_offers?.filter(o => o.variation_name) || [];
        variations.forEach(v => addVariationRow(v.variation_name, v.price, v.sale_price, (v.commission_rate > 0 ? v.commission_rate : ''), v.affiliate_url));

        document.getElementById('formTitle').innerText = "Edit Product"; document.getElementById('saveBtn').innerText = "Update Product"; document.getElementById('cancelEditBtn').style.display = "block";
        const listContainer = document.getElementById('productListContainer'); if(listContainer && listContainer.style.display === 'none') document.getElementById('toggleProductListBtn').click();
        document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
    } catch (err) { alert("Error loading product: " + err.message); }
}

window.deleteProduct = async function(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try { const { error } = await window.supabaseClient.from('products').delete().eq('id', id); if (error) throw error; alert("Product deleted!"); await loadStats(); await loadProductsList(); } catch (err) { alert("Error deleting product: " + err.message); }
}

function setupProductForm() {
    const form = document.getElementById('productForm'); const cancelBtn = document.getElementById('cancelEditBtn'); if (!form) return;
    cancelBtn.addEventListener('click', () => {
        form.reset(); document.getElementById('variationsContainer').innerHTML = '';
        document.getElementById('pId').value = ''; document.getElementById('pOfferId').value = '';
        document.getElementById('formTitle').innerText = "Add New Product"; document.getElementById('saveBtn').innerText = "Save Product"; cancelBtn.style.display = "none";
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('pId').value; const isEditing = id !== '';
        const eventName = document.getElementById('pEventName').value.trim(); const saleEndDate = document.getElementById('pSaleEndDate').value;
        const commInput = document.getElementById('pCommission').value.trim(); const commission = commInput === '' ? 0 : (parseFloat(commInput) || 0);
        const price = parseFloat(document.getElementById('pPrice').value) || 0;
        const salePrice = document.getElementById('pSalePrice').value ? parseFloat(document.getElementById('pSalePrice').value) : null;

        const productData = {
            title: document.getElementById('pTitle').value.trim(), slug: document.getElementById('pSlug').value.trim(),
            image_url: document.getElementById('pImg').value.trim(), category_slug: document.getElementById('pCategory').value,
            description: document.getElementById('pDesc').value.trim(), review_html: document.getElementById('pReview').value.trim(),
            is_featured: document.getElementById('pFeatured').checked, is_trending: document.getElementById('pTrending').checked,
            is_special_deal: document.getElementById('pSpecialDeal').checked,
            badge: document.getElementById('pBadge').value.trim() || null, rating: document.getElementById('pRating').value ? parseFloat(document.getElementById('pRating').value) : null,
            reviews_count: document.getElementById('pReviewsCount').value ? parseInt(document.getElementById('pReviewsCount').value) : 0,
            gallery_images: document.getElementById('pGallery').value.trim() ? document.getElementById('pGallery').value.split('\n').map(u=>u.trim()).filter(Boolean) : [],
            video_url: document.getElementById('pVideo').value.trim() || null,
            event_name: eventName || null, sale_end_date: saleEndDate ? new Date(saleEndDate).toISOString() : null,
            is_available: true
        };

        if (!productData.title || !productData.slug || !productData.image_url) return alert('Please fill required fields.');

        const mainOfferData = {
            store_name: document.getElementById('pStore').value.trim().toLowerCase(), price: price, sale_price: salePrice,
            commission_rate: commission, currency: document.getElementById('pCurrency').value,
            affiliate_url: document.getElementById('pAffUrl').value.trim(), variation_name: null
        };

        const variations = [];
        document.querySelectorAll('.variation-row').forEach(row => {
            const vName = row.querySelector('.var-name').value.trim(); 
            const vPrice = parseFloat(row.querySelector('.var-price').value);
            const vSalePrice = row.querySelector('.var-sale-price').value ? parseFloat(row.querySelector('.var-sale-price').value) : null;
            const vCommInput = row.querySelector('.var-comm').value.trim(); 
            const vComm = vCommInput === '' ? commission : (parseFloat(vCommInput) || 0);
            const vUrl = row.querySelector('.var-url').value.trim() || mainOfferData.affiliate_url;
            
            if (vName && !isNaN(vPrice)) { variations.push({ ...mainOfferData, price: vPrice, sale_price: vSalePrice, commission_rate: vComm, affiliate_url: vUrl, variation_name: vName }); }
        });

        try {
            let productId = id;
            if (isEditing) {
                const { error: prodErr } = await window.supabaseClient.from('products').update(productData).eq('id', id); if (prodErr) throw prodErr;
                await window.supabaseClient.from('affiliate_offers').delete().eq('product_id', id);
            } else {
                const { data: newProduct, error: prodErr } = await window.supabaseClient.from('products').insert([productData]).select().single(); if (prodErr) throw prodErr; productId = newProduct.id;
            }
            if (price > 0 || variations.length === 0) { mainOfferData.product_id = productId; await window.supabaseClient.from('affiliate_offers').insert([mainOfferData]); }
            if (variations.length > 0) { variations.forEach(v => v.product_id = productId); const { error: varErr } = await window.supabaseClient.from('affiliate_offers').insert(variations); if (varErr) throw varErr; }
            alert(`"${productData.title}" saved successfully!`); form.reset(); document.getElementById('variationsContainer').innerHTML = '';
            document.getElementById('pId').value = ''; document.getElementById('formTitle').innerText = "Add New Product"; document.getElementById('saveBtn').innerText = "Save Product"; cancelBtn.style.display = "none";
            await loadStats(); await loadProductsList();
        } catch (err) { alert('Save error: ' + (err.message || 'Check RLS policies.')); }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => { await API.signOut(); window.location.reload(); });
}
