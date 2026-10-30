let allProducts = [];

async function uploadFileToSupabase(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { data, error } = await window.supabaseClient.storage
        .from('product-images')
        .upload(fileName, file);

    if (error) throw error;

    const { data: publicUrlData } = window.supabaseClient.storage
        .from('product-images')
        .getPublicUrl(fileName);
        
    return publicUrlData.publicUrl;
}

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof API === 'undefined' || !API.getCurrentUser) { alert('API not loaded. Refresh the page.'); return; }
    const auth = await API.getCurrentUser();
    if (!auth) return showLogin();
    if (auth.role !== 'admin') { alert('Access denied. Admin only.'); await API.signOut(); return showLogin(); }

    showDashboard(); 
    await loadStats(); 
    await loadSiteSettings(); 
    await loadProductsList(); 
    setupProductForm(); 
    setupToggleList();
    setupToggleAddProduct(); 
    setupToggleSpecialDeal(); 
    setupToggleFlashSale();
    setupToggleSale2();
    
    document.getElementById('adminCategoryFilter')?.addEventListener('change', renderTable);
    document.getElementById('adminSearchInput')?.addEventListener('input', renderTable);
    
    // Save App Download Setting
    document.getElementById('saveAppSettingsBtn')?.addEventListener('click', async function() {
        const isLive = document.getElementById('appDownloadStatusToggle').checked;
        const { error } = await window.supabaseClient.from('site_settings').update({ 
            show_app_download: isLive 
        }).eq('id', 1);

        if (error) alert("Error: " + error.message);
        else alert(`App Download Popup is now ${isLive ? 'LIVE (Visible)' : 'STOPPED (Hidden)'} on website!`);
    });

    // Save Special Deal Settings
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
        else {
            alert("Special Deal Design updated successfully!");
            document.getElementById('specialDealContainer').style.display = 'none';
            const btn = document.getElementById('toggleSpecialDealBtn');
            btn.textContent = 'Show Settings';
            btn.style.background = '#d946ef';
        }
    });

    // Save Sale Section 1 Settings
    document.getElementById('saveFlashSettingsBtn')?.addEventListener('click', async function() {
        const newTitle = document.getElementById('flashTitleText').value.trim();
        const fontFamily = document.getElementById('flashTitleFontFamily').value;
        const fontSize = document.getElementById('flashTitleFontSize').value.trim() || '2rem';
        const fontWeight = document.getElementById('flashTitleFontWeight').value;
        const fontStyle = document.getElementById('flashTitleFontStyle').value;

        if(!newTitle) return alert("Sale Section 1 Title cannot be empty");
        
        const { error } = await window.supabaseClient.from('site_settings').update({ 
            flash_title_text: newTitle,
            flash_title_font_family: fontFamily,
            flash_title_font_size: fontSize,
            flash_title_font_weight: fontWeight,
            flash_title_font_style: fontStyle
        }).eq('id', 1);

        if (error) alert("Error: " + error.message);
        else {
            alert("Sale Section 1 Design updated successfully!");
            document.getElementById('flashSaleContainer').style.display = 'none';
            const btn = document.getElementById('toggleFlashSaleBtn');
            btn.textContent = 'Show Settings';
            btn.style.background = '#ea580c';
        }
    });

    // Save Sale Section 2 Settings
    document.getElementById('saveSale2SettingsBtn')?.addEventListener('click', async function() {
        const newTitle = document.getElementById('sale2TitleText').value.trim();
        const fontFamily = document.getElementById('sale2TitleFontFamily').value;
        const fontSize = document.getElementById('sale2TitleFontSize').value.trim() || '2rem';
        const fontWeight = document.getElementById('sale2TitleFontWeight').value;
        const fontStyle = document.getElementById('sale2TitleFontStyle').value;

        if(!newTitle) return alert("Sale Section 2 Title cannot be empty");
        
        const { error } = await window.supabaseClient.from('site_settings').update({ 
            sale_section_2_title: newTitle,
            sale_section_2_font_family: fontFamily,
            sale_section_2_font_size: fontSize,
            sale_section_2_font_weight: fontWeight,
            sale_section_2_font_style: fontStyle
        }).eq('id', 1);

        if (error) alert("Error: " + error.message);
        else {
            alert("Sale Section 2 Design updated successfully!");
            document.getElementById('sale2Container').style.display = 'none';
            const btn = document.getElementById('toggleSale2Btn');
            btn.textContent = 'Show Settings';
            btn.style.background = '#10b981';
        }
    });

    // Check Availability Button
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

    // Cancel Offer Buttons
    document.getElementById('cancelOfferBtn')?.addEventListener('click', () => {
        document.getElementById('pEventName').value = '';
        document.getElementById('pSaleEndDate').value = '';
        alert('Offer 1 details cleared. Save product to confirm cancellation.');
    });

    document.getElementById('cancelOffer2Btn')?.addEventListener('click', () => {
        document.getElementById('pEventName2').value = '';
        document.getElementById('pSaleEndDate2').value = '';
        alert('Offer 2 details cleared. Save product to confirm cancellation.');
    });
});

function setupToggleAddProduct() {
    const toggleBtn = document.getElementById('toggleAddProductBtn');
    const formContainer = document.getElementById('addProductContainer');
    if (toggleBtn && formContainer) {
        toggleBtn.addEventListener('click', () => {
            if (formContainer.style.display === 'none') {
                formContainer.style.display = 'block'; 
                toggleBtn.textContent = 'Hide Product Form'; 
                toggleBtn.style.background = '#EF4444'; // Red
            } else {
                formContainer.style.display = 'none'; 
                toggleBtn.textContent = 'Show Product Form'; 
                toggleBtn.style.background = '#16a34a'; // Green
            }
        });
    }
}

function setupToggleSpecialDeal() {
    const toggleBtn = document.getElementById('toggleSpecialDealBtn');
    const container = document.getElementById('specialDealContainer');
    if (toggleBtn && container) {
        toggleBtn.addEventListener('click', () => {
            if (container.style.display === 'none') {
                container.style.display = 'block'; 
                toggleBtn.textContent = 'Hide Settings'; 
                toggleBtn.style.background = '#EF4444';
            } else {
                container.style.display = 'none'; 
                toggleBtn.textContent = 'Show Settings'; 
                toggleBtn.style.background = '#d946ef';
            }
        });
    }
}

function setupToggleFlashSale() {
    const toggleBtn = document.getElementById('toggleFlashSaleBtn');
    const container = document.getElementById('flashSaleContainer');
    if (toggleBtn && container) {
        toggleBtn.addEventListener('click', () => {
            if (container.style.display === 'none') {
                container.style.display = 'block'; 
                toggleBtn.textContent = 'Hide Settings'; 
                toggleBtn.style.background = '#EF4444';
            } else {
                container.style.display = 'none'; 
                toggleBtn.textContent = 'Show Settings'; 
                toggleBtn.style.background = '#ea580c';
            }
        });
    }
}

function setupToggleSale2() {
    const toggleBtn = document.getElementById('toggleSale2Btn');
    const container = document.getElementById('sale2Container');
    if (toggleBtn && container) {
        toggleBtn.addEventListener('click', () => {
            if (container.style.display === 'none') {
                container.style.display = 'block'; 
                toggleBtn.textContent = 'Hide Settings'; 
                toggleBtn.style.background = '#EF4444';
            } else {
                container.style.display = 'none'; 
                toggleBtn.textContent = 'Show Settings'; 
                toggleBtn.style.background = '#10b981';
            }
        });
    }
}

async function loadSiteSettings() {
    const { data } = await window.supabaseClient.from('site_settings').select('*').eq('id', 1).maybeSingle();
    if (data) {
        if(document.getElementById('appDownloadStatusToggle')) {
            document.getElementById('appDownloadStatusToggle').checked = data.show_app_download !== false;
        }
        if(document.getElementById('specialDealTitleInput')) {
            document.getElementById('specialDealTitleInput').value = data.special_deal_title || 'First order deal';
            document.getElementById('titleFontFamily').value = data.title_font_family || 'Poppins';
            document.getElementById('titleFontSize').value = data.title_font_size || '2rem';
            document.getElementById('titleFontWeight').value = data.title_font_weight || '800';
            document.getElementById('titleFontStyle').value = data.title_font_style || 'normal';
        }
        if(document.getElementById('flashTitleText')) {
            document.getElementById('flashTitleText').value = data.flash_title_text || 'Sale Section 1';
            document.getElementById('flashTitleFontFamily').value = data.flash_title_font_family || 'Poppins';
            document.getElementById('flashTitleFontSize').value = data.flash_title_font_size || '2rem';
            document.getElementById('flashTitleFontWeight').value = data.flash_title_font_weight || '900';
            document.getElementById('flashTitleFontStyle').value = data.flash_title_font_style || 'normal';
        }
        if(document.getElementById('sale2TitleText')) {
            document.getElementById('sale2TitleText').value = data.sale_section_2_title || 'Sale Section 2';
            document.getElementById('sale2TitleFontFamily').value = data.sale_section_2_font_family || 'Poppins';
            document.getElementById('sale2TitleFontSize').value = data.sale_section_2_font_size || '2rem';
            document.getElementById('sale2TitleFontWeight').value = data.sale_section_2_font_weight || '900';
            document.getElementById('sale2TitleFontStyle').value = data.sale_section_2_font_style || 'normal';
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
                listContainer.style.display = 'none'; toggleBtn.textContent = 'Show Product List'; toggleBtn.style.background = '#4f46e5';
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
        const stats = await API.getAdminStats(); 
        const p = document.getElementById('statProducts'); 
        const c = document.getElementById('statClicks');
        
        if (p) p.innerText = stats.totalProducts; 
        if (c) c.innerText = stats.totalClicks;

        const { data: visitors } = await window.supabaseClient.rpc('get_total_visitors');
        const { data: installs } = await window.supabaseClient.rpc('get_active_app_installs');
        
        const vEl = document.getElementById('statVisitors');
        const iEl = document.getElementById('statAppInstalls');
        
        if (vEl) vEl.innerText = visitors || 0;
        if (iEl) iEl.innerText = installs || 0;

    } catch (err) { 
        console.warn('Stats error:', err); 
    }
}

async function loadProductsList() {
    const tbody = document.getElementById('productListBody'); if (!tbody) return;
    try {
        const { data: products, error } = await window.supabaseClient.from('products').select('*, affiliate_offers(*)').order('created_at', { ascending: false });
        if (error) throw error;
        allProducts = products || [];
        
        const masterCats = (typeof CONFIG !== 'undefined' && CONFIG.categories) ? CONFIG.categories : [];
        const defaultCats = masterCats.filter(c => c.slug !== 'all');
        const dbCats = [...new Set(allProducts.map(p => p.category_slug).filter(Boolean))];
        
        const combinedCats = [...defaultCats];
        dbCats.forEach(slug => {
            if (!combinedCats.find(c => c.slug === slug)) {
                combinedCats.push({ slug: slug, name: slug.charAt(0).toUpperCase() + slug.slice(1).replace('-', ' ') });
            }
        });

        const categoryFilter = document.getElementById('adminCategoryFilter');
        if (categoryFilter) {
            categoryFilter.innerHTML = `<option value="all">All Categories</option>` + combinedCats.map(c => `<option value="${c.slug}">${c.name}</option>`).join('');
        }

        const addCategorySelect = document.getElementById('pCategory');
        if (addCategorySelect) {
            addCategorySelect.innerHTML = combinedCats.map(c => `<option value="${c.slug}">${c.name}</option>`).join('');
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
        const defaultOffer = p.affiliate_offers?.[0] || {};
        
        const basePrice = parseFloat(defaultOffer.price) || 0;
        const salePrice = parseFloat(defaultOffer.sale_price) || 0;
        const commissionRate = parseFloat(defaultOffer.commission_rate) || 0;
        const currency = defaultOffer.currency || 'USD';

        let finalBasePrice = basePrice;
        let finalSalePrice = salePrice;

        if (commissionRate > 0) {
            finalBasePrice = basePrice + (basePrice * (commissionRate / 100));
            if (salePrice > 0) {
                finalSalePrice = salePrice + (salePrice * (commissionRate / 100));
            }
        }
        
        let priceStr = '';
        if (defaultOffer.price) {
            if (salePrice > 0) {
                priceStr = `<div style="text-decoration:line-through; color:#94A3B8; font-size:0.8rem;">${finalBasePrice.toFixed(2)} ${currency}</div>
                            <div style="font-weight:bold; color:#FF5A3C; font-size:1rem;">${finalSalePrice.toFixed(2)} ${currency}</div>`;
            } else {
                priceStr = `<strong style="color:#1E1B4B;">${finalBasePrice.toFixed(2)} ${currency}</strong>`;
            }
        } else {
            priceStr = 'N/A';
        }
        
        const isAvailable = p.is_available !== false;
        const rowClass = isAvailable ? '' : 'unavailable-row';
        const statusBadge = isAvailable ? '' : `<span class="badge-unavailable">UNAVAILABLE</span>`;

        return `
            <tr class="${rowClass}">
                <td style="text-align: center;"><img src="${p.image_url}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;"></td>
                <td>${p.title} ${statusBadge}</td>
                <td style="text-align: center;">${priceStr}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-edit" onclick="editProduct('${p.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteProduct('${p.id}')">Delete</button>
                    </div>
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
        const { data: p, error } = await window.supabaseClient.from('products').select('*, affiliate_offers(*)').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!p) { alert("Product not found."); return; }

        const defaultOffer = p.affiliate_offers?.[0] || {};
        
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

        document.getElementById('pEventName2').value = p.event_name_2 || '';
        if(p.sale_end_date_2) {
            const d = new Date(p.sale_end_date_2); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            document.getElementById('pSaleEndDate2').value = d.toISOString().slice(0,16);
        } else { document.getElementById('pSaleEndDate2').value = ''; }

        document.getElementById('pStore').value = defaultOffer.store_name || ''; 
        document.getElementById('pMainVarName').value = defaultOffer.variation_name || ''; 
        document.getElementById('pPrice').value = defaultOffer.price || '';
        document.getElementById('pSalePrice').value = defaultOffer.sale_price || '';
        document.getElementById('pCommission').value = (defaultOffer.commission_rate && defaultOffer.commission_rate > 0) ? defaultOffer.commission_rate : '';
        document.getElementById('pCurrency').value = defaultOffer.currency || 'USD'; document.getElementById('pAffUrl').value = defaultOffer.affiliate_url || '';
        
        document.getElementById('pDesc').value = p.description || ''; document.getElementById('pReview').value = p.review_html || '';
        document.getElementById('pFeatured').checked = p.is_featured || false; document.getElementById('pTrending').checked = p.is_trending || false;
        document.getElementById('pSpecialDeal').checked = p.is_special_deal || false;
        
        document.getElementById('pSendNotification').checked = false;
        document.getElementById('pWriteBlog').checked = false; // Edit ke waqt blog trigger off rahe

        const varContainer = document.getElementById('variationsContainer'); varContainer.innerHTML = '';
        const variations = p.affiliate_offers?.slice(1) || []; 
        variations.forEach(v => addVariationRow(v.variation_name, v.price, v.sale_price, (v.commission_rate > 0 ? v.commission_rate : ''), v.affiliate_url));

        document.getElementById('pImgFile').value = ''; document.getElementById('pGalleryFile').value = '';
        document.getElementById('pImgFileName').innerText = 'No file chosen'; document.getElementById('pGalleryFileName').innerText = 'No files chosen';

        document.getElementById('formTitle').innerText = "Edit Product"; document.getElementById('saveBtn').innerText = "Update Product"; document.getElementById('cancelEditBtn').style.display = "block";
        
        const formContainer = document.getElementById('addProductContainer');
        const toggleBtn = document.getElementById('toggleAddProductBtn');
        if (formContainer && formContainer.style.display === 'none') {
            formContainer.style.display = 'block'; 
            toggleBtn.textContent = 'Hide Product Form'; 
            toggleBtn.style.background = '#EF4444';
        }
        document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
        
        document.querySelectorAll('.error-input').forEach(el => el.classList.remove('error-input'));

    } catch (err) { alert("Error loading product: " + err.message); }
}

window.deleteProduct = async function(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try { const { error } = await window.supabaseClient.from('products').delete().eq('id', id); if (error) throw error; alert("Product deleted!"); await loadStats(); await loadProductsList(); } catch (err) { alert("Error deleting product: " + err.message); }
}

function setupProductForm() {
    const form = document.getElementById('productForm'); const cancelBtn = document.getElementById('cancelEditBtn'); if (!form) return;
    
    form.querySelectorAll('input, textarea, select').forEach(el => {
        el.addEventListener('input', function() {
            if (this.classList.contains('error-input')) {
                if (this.id === 'pImg') {
                    const fileInput = document.getElementById('pImgFile');
                    if (this.value.trim() || fileInput.files.length > 0) {
                        this.classList.remove('error-input');
                    }
                } else if (this.value.trim()) {
                    this.classList.remove('error-input');
                }
            }
        });
    });

    cancelBtn.addEventListener('click', () => {
        form.reset(); document.getElementById('variationsContainer').innerHTML = '';
        document.getElementById('pId').value = ''; document.getElementById('pOfferId').value = '';
        
        document.getElementById('pImgFile').value = ''; document.getElementById('pGalleryFile').value = '';
        document.getElementById('pImgFileName').innerText = 'No file chosen'; document.getElementById('pGalleryFileName').innerText = 'No files chosen';

        document.getElementById('formTitle').innerText = "Add / Update Product"; document.getElementById('saveBtn').innerText = "Save Product"; cancelBtn.style.display = "none";
        
        document.querySelectorAll('.error-input').forEach(el => el.classList.remove('error-input'));
        
        document.getElementById('addProductContainer').style.display = 'none';
        const toggleBtn = document.getElementById('toggleAddProductBtn');
        toggleBtn.textContent = 'Show Product Form';
        toggleBtn.style.background = '#16a34a';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (window.isSavingProduct) return;
        window.isSavingProduct = true;

        let hasError = false;
        let firstErrorElement = null;
        const requiredInputs = form.querySelectorAll('[required]');
        
        requiredInputs.forEach(input => {
            input.classList.remove('error-input');
            if (!input.value.trim()) {
                input.classList.add('error-input');
                hasError = true;
                if (!firstErrorElement) firstErrorElement = input;
            }
        });

        const imgUrl = document.getElementById('pImg');
        const imgFile = document.getElementById('pImgFile');
        if (!imgUrl.value.trim() && imgFile.files.length === 0) {
            imgUrl.classList.add('error-input');
            hasError = true;
            if (!firstErrorElement) firstErrorElement = imgUrl;
        }

        if (hasError) {
            alert('Please fill all the required fields marked with a red star (*).');
            if (firstErrorElement) {
                firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => { firstErrorElement.focus(); }, 500);
            }
            window.isSavingProduct = false; 
            return;
        }

        const saveBtn = document.getElementById('saveBtn');
        const originalBtnText = saveBtn.innerText;
        saveBtn.innerText = "Saving... Please wait"; saveBtn.disabled = true;

        try {
            const id = document.getElementById('pId').value; const isEditing = id !== '';
            const eventName = document.getElementById('pEventName').value.trim(); const saleEndDate = document.getElementById('pSaleEndDate').value;
            const eventName2 = document.getElementById('pEventName2').value.trim(); const saleEndDate2 = document.getElementById('pSaleEndDate2').value;
            
            const commInput = document.getElementById('pCommission').value.trim(); const commission = commInput === '' ? 0 : (parseFloat(commInput) || 0);
            const price = parseFloat(document.getElementById('pPrice').value) || 0;
            const salePrice = document.getElementById('pSalePrice').value ? parseFloat(document.getElementById('pSalePrice').value) : null;

            let finalImageUrl = imgUrl.value.trim();
            const primaryFileInput = imgFile;
            if (primaryFileInput.files.length > 0) { saveBtn.innerText = "Uploading Main Image..."; finalImageUrl = await uploadFileToSupabase(primaryFileInput.files[0]); }

            let finalGalleryUrls = document.getElementById('pGallery').value.trim() ? document.getElementById('pGallery').value.split('\n').map(u=>u.trim()).filter(Boolean) : [];
            const galleryFileInput = document.getElementById('pGalleryFile');
            if (galleryFileInput.files.length > 0) {
                saveBtn.innerText = "Uploading Gallery...";
                for (let i = 0; i < galleryFileInput.files.length; i++) { const url = await uploadFileToSupabase(galleryFileInput.files[i]); finalGalleryUrls.push(url); }
            }

            const productData = {
                title: document.getElementById('pTitle').value.trim(), slug: document.getElementById('pSlug').value.trim(),
                image_url: finalImageUrl, 
                category_slug: document.getElementById('pCategory').value,
                description: document.getElementById('pDesc').value.trim(), review_html: document.getElementById('pReview').value.trim(),
                is_featured: document.getElementById('pFeatured').checked, is_trending: document.getElementById('pTrending').checked,
                is_special_deal: document.getElementById('pSpecialDeal').checked,
                badge: document.getElementById('pBadge').value.trim() || null, rating: document.getElementById('pRating').value ? parseFloat(document.getElementById('pRating').value) : null,
                reviews_count: document.getElementById('pReviewsCount').value ? parseInt(document.getElementById('pReviewsCount').value) : 0,
                gallery_images: finalGalleryUrls, video_url: document.getElementById('pVideo').value.trim() || null,
                event_name: eventName || null, sale_end_date: saleEndDate ? new Date(saleEndDate).toISOString() : null,
                event_name_2: eventName2 || null, sale_end_date_2: saleEndDate2 ? new Date(saleEndDate2).toISOString() : null,
                is_available: true
            };

            const mainOfferData = {
                store_name: document.getElementById('pStore').value.trim().toLowerCase(), 
                variation_name: document.getElementById('pMainVarName').value.trim() || null,
                price: price, sale_price: salePrice,
                commission_rate: commission, currency: document.getElementById('pCurrency').value,
                affiliate_url: document.getElementById('pAffUrl').value.trim()
            };

            const variations = [];
            document.querySelectorAll('.variation-row').forEach(row => {
                const vName = row.querySelector('.var-name').value.trim(); const vPrice = parseFloat(row.querySelector('.var-price').value);
                const vSalePrice = row.querySelector('.var-sale-price').value ? parseFloat(row.querySelector('.var-sale-price').value) : null;
                const vCommInput = row.querySelector('.var-comm').value.trim(); const vComm = vCommInput === '' ? commission : (parseFloat(vCommInput) || 0);
                const vUrl = row.querySelector('.var-url').value.trim() || mainOfferData.affiliate_url;
                if (vName && !isNaN(vPrice)) { variations.push({ ...mainOfferData, price: vPrice, sale_price: vSalePrice, commission_rate: vComm, affiliate_url: vUrl, variation_name: vName }); }
            });

            let productId = id;
            if (isEditing) {
                const { error: prodErr } = await window.supabaseClient.from('products').update(productData).eq('id', id); if (prodErr) throw prodErr;
                await window.supabaseClient.from('affiliate_offers').delete().eq('product_id', id);
            } else {
                const { data: newProduct, error: prodErr } = await window.supabaseClient.from('products').insert([productData]).select().single(); if (prodErr) throw prodErr; productId = newProduct.id;
            }
            if (price > 0 || variations.length === 0) { mainOfferData.product_id = productId; await window.supabaseClient.from('affiliate_offers').insert([mainOfferData]); }
            if (variations.length > 0) { variations.forEach(v => v.product_id = productId); const { error: varErr } = await window.supabaseClient.from('affiliate_offers').insert(variations); if (varErr) throw varErr; }
            
            // ⭐ AI BLOG GENERATION TRIGGER ⭐
            const writeBlog = document.getElementById('pWriteBlog').checked;
            if (writeBlog && !isEditing) {
                try {
                    console.log("Triggering AI Blog Generation...");
                    fetch('/api/generate-blog', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            productId: productId,
                            title: productData.title,
                            description: productData.description,
                            storeName: mainOfferData.store_name,
                            affiliateUrl: mainOfferData.affiliate_url,
                            imageUrl: productData.image_url
                        })
                    }).then(res => res.json()).then(data => console.log("AI Blog Result:", data));
                    
                    alert("Product saved! AI is writing the blog in the background. Check 'Blogs List' in 1-2 minutes.");
                } catch (err) {
                    console.warn("AI Blog trigger failed:", err);
                }
            }

            const sendNotif = document.getElementById('pSendNotification').checked;
            if (sendNotif) {
                try {
                    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
                    const { data: existingNotifs } = await window.supabaseClient
                        .from('app_notifications')
                        .select('id')
                        .eq('product_slug', productData.slug)
                        .gte('created_at', tenSecondsAgo);

                    if (existingNotifs && existingNotifs.length > 0) {
                        console.log("Duplicate notification blocked (Recent one exists).");
                    } else {
                        const { data: settings } = await window.supabaseClient.from('site_settings').select('*').eq('id', 1).maybeSingle();
                        
                        let spTitle = 'Special Deal';
                        let s1Title = 'Sale Section 1';
                        let s2Title = 'Sale Section 2';

                        if (settings) {
                            if (settings.special_deal_title) spTitle = settings.special_deal_title;
                            if (settings.flash_title_text) s1Title = settings.flash_title_text;
                            if (settings.sale_section_2_title) s2Title = settings.sale_section_2_title;
                        }
                        
                        let notifType = 'product';
                        let notifTitle = isEditing ? "Product Updated! 🛍️" : "New Product Added! 🛍️";
                        let notifMsg = `Check out ${productData.title}`;
                        
                        const now = new Date();
                        const isFlash1Active = eventName && saleEndDate && new Date(saleEndDate) > now;
                        const isFlash2Active = eventName2 && saleEndDate2 && new Date(saleEndDate2) > now;
                        const isSpecialActive = document.getElementById('pSpecialDeal').checked;

                        if (isFlash1Active) {
                            notifType = 'flash_sale';
                            notifTitle = `🔥 ${s1Title} Started!`;
                            notifMsg = `${productData.title} is now in ${s1Title}!`;
                        } else if (isFlash2Active) {
                            notifType = 'flash_sale_2';
                            notifTitle = `🔥 ${s2Title} Started!`;
                            notifMsg = `${productData.title} is now in ${s2Title}!`;
                        } else if (isSpecialActive) {
                            notifType = 'special_deal';
                            notifTitle = `🎁 ${spTitle} Alert!`;
                            notifMsg = `${productData.title} is now in ${spTitle}!`;
                        }

                        await window.supabaseClient.from('app_notifications').insert([{
                            title: notifTitle,
                            message: notifMsg,
                            product_slug: productData.slug,
                            type: notifType
                        }]);
                    }
                } catch (notifError) {
                    console.warn("Notification send error:", notifError);
                }
            }

            alert(`"${productData.title}" saved successfully!`); 
            form.reset(); document.getElementById('variationsContainer').innerHTML = '';
            document.getElementById('pId').value = ''; document.getElementById('formTitle').innerText = "Add / Update Product"; cancelBtn.style.display = "none";
            primaryFileInput.value = ''; galleryFileInput.value = '';
            document.getElementById('pImgFileName').innerText = 'No file chosen'; document.getElementById('pGalleryFileName').innerText = 'No files chosen';
            document.getElementById('pWriteBlog').checked = false; // Reset checkbox

            document.getElementById('addProductContainer').style.display = 'none';
            const toggleBtn = document.getElementById('toggleAddProductBtn');
            toggleBtn.textContent = 'Show Product Form'; 
            toggleBtn.style.background = '#16a34a';

            await loadStats(); await loadProductsList();
        } catch (err) { 
            alert('Error: ' + (err.message || 'Check RLS policies and Storage Bucket.')); 
        } finally {
            saveBtn.innerText = originalBtnText; 
            saveBtn.disabled = false;
            window.isSavingProduct = false; 
        }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => { await API.signOut(); window.location.reload(); });
}

// ⭐ BLOG MANAGEMENT LOGIC ⭐
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('blogForm')) return;

    const toggleFormBtn = document.getElementById('toggleBlogFormBtn');
    const formContainer = document.getElementById('blogFormContainer');
    const toggleListBtn = document.getElementById('toggleBlogListBtn');
    const listContainer = document.getElementById('blogListContainer');
    const blogForm = document.getElementById('blogForm');
    const cancelBtn = document.getElementById('cancelBlogBtn');

    if (toggleFormBtn && formContainer) {
        toggleFormBtn.addEventListener('click', () => {
            if (formContainer.style.display === 'none') {
                formContainer.style.display = 'block';
                toggleFormBtn.textContent = 'Hide Blog Form';
                toggleFormBtn.style.background = '#EF4444';
            } else {
                formContainer.style.display = 'none';
                toggleFormBtn.textContent = 'Show Blog Form';
                toggleFormBtn.style.background = '#0d9488';
            }
        });
    }

    if (toggleListBtn && listContainer) {
        toggleListBtn.addEventListener('click', () => {
            if (listContainer.style.display === 'none') {
                listContainer.style.display = 'block';
                toggleListBtn.style.background = '#EF4444';
                loadBlogList();
            } else {
                listContainer.style.display = 'none';
                toggleListBtn.style.background = '#9333ea';
            }
        });
    }

    async function loadBlogList() {
        const tbody = document.getElementById('blogListBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';

        const { data: blogs, error } = await window.supabaseClient.from('blogs').select('*').order('created_at', { ascending: false });
        
        if (error || !blogs || blogs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No blog posts found.</td></tr>';
            return;
        }

        tbody.innerHTML = blogs.map(b => {
            const isPublished = b.is_published !== false;
            const statusBadge = isPublished ? '' : `<span style="background:#F59E0B; color:white; padding:2px 6px; border-radius:4px; font-size:0.65rem; margin-left:5px;">DRAFT</span>`;
            
            let actionBtns = `<button class="btn-edit" onclick="editBlog('${b.id}', '${b.title.replace(/'/g, "\\'")}', '${b.slug}', '${b.image_url || ''}')">Edit</button>
                            <button class="btn-delete" onclick="deleteBlog('${b.id}')">Delete</button>`;
            
            if (!isPublished) {
                actionBtns = `<button onclick="publishBlog('${b.id}')" style="background:#10B981; color:white; padding:6px 12px; border:none; border-radius:4px; cursor:pointer; font-size:0.85rem; font-weight:bold;">Publish</button>` + actionBtns;
            }

            return `
                <tr>
                    <td style="text-align: center;"><img src="${b.image_url || '/assets/icon-192.png?v=4'}" style="width:50px;height:40px;object-fit:cover;border-radius:4px;"></td>
                    <td>${b.title} ${statusBadge}</td>
                    <td style="text-align:center;">${new Date(b.created_at).toLocaleDateString()}</td>
                    <td><div class="action-btns">${actionBtns}</div></td>
                </tr>
            `;
        }).join('');
    }

    window.editBlog = async function(id, title, slug, imageUrl) {
        document.getElementById('bId').value = id;
        document.getElementById('bTitle').value = title;
        document.getElementById('bSlug').value = slug;
        document.getElementById('bImg').value = imageUrl;
        
        const { data } = await window.supabaseClient.from('blogs').select('content_html').eq('id', id).single();
        if(data) document.getElementById('bContent').value = data.content_html;

        document.getElementById('blogFormTitle').innerText = "Edit Blog Post";
        document.getElementById('saveBlogBtn').innerText = "Update Post";
        cancelBtn.style.display = 'block';
        
        formContainer.style.display = 'block';
        toggleFormBtn.textContent = 'Hide Blog Form';
        toggleFormBtn.style.background = '#EF4444';
        formContainer.scrollIntoView({ behavior: 'smooth' });
    }

    window.deleteBlog = async function(id) {
        if (!confirm("Are you sure you want to delete this post?")) return;
        const { error } = await window.supabaseClient.from('blogs').delete().eq('id', id);
        if (error) alert("Error deleting: " + error.message);
        else loadBlogList();
    }

    window.publishBlog = async function(id) {
        if (!confirm("Publish this blog to the live website?")) return;
        try {
            const { error } = await window.supabaseClient.from('blogs').update({ is_published: true }).eq('id', id);
            if (error) throw error;
            alert("Blog published successfully!");
            loadBlogList();
        } catch (err) { alert("Error: " + err.message); }
    }

    cancelBtn.addEventListener('click', () => {
        blogForm.reset();
        document.getElementById('bId').value = '';
        document.getElementById('blogFormTitle').innerText = "Add New Blog Post";
        document.getElementById('saveBlogBtn').innerText = "Publish Post";
        cancelBtn.style.display = 'none';
        formContainer.style.display = 'none';
        toggleFormBtn.textContent = 'Show Blog Form';
        toggleFormBtn.style.background = '#0d9488';
    });

    blogForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveBlogBtn');
        const originalText = saveBtn.innerText;
        saveBtn.innerText = "Saving..."; saveBtn.disabled = true;

        try {
            const id = document.getElementById('bId').value;
            const blogData = {
                title: document.getElementById('bTitle').value.trim(),
                slug: document.getElementById('bSlug').value.trim(),
                image_url: document.getElementById('bImg').value.trim() || null,
                content_html: document.getElementById('bContent').value.trim(),
                is_published: true // Manual blogs directly published
            };

            if (id) {
                const { error } = await window.supabaseClient.from('blogs').update(blogData).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await window.supabaseClient.from('blogs').insert([blogData]);
                if (error) throw error;
            }

            alert("Blog Post Saved Successfully!");
            blogForm.reset();
            document.getElementById('bId').value = '';
            document.getElementById('blogFormTitle').innerText = "Add New Blog Post";
            document.getElementById('saveBlogBtn').innerText = "Publish Post";
            cancelBtn.style.display = 'none';
            formContainer.style.display = 'none';
            toggleFormBtn.textContent = 'Show Blog Form';
            toggleFormBtn.style.background = '#0d9488';
            
            if(listContainer.style.display === 'block') loadBlogList();

        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            saveBtn.innerText = originalText; saveBtn.disabled = false;
        }
    });
});
