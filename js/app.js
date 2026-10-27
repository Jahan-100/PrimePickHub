/**
 * PrimePickHub Homepage Renderer
 */

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function isValidExternalURL(url) { if (typeof url !== 'string') return false; try { const p = new URL(url); return p.protocol === 'https:' || p.protocol === 'http:'; } catch { return false; } }
function isValidURL(url) { if (!url || typeof url !== 'string') return false; try { const p = new URL(url, window.location.origin); return p.protocol === 'http:' || p.protocol === 'https:'; } catch { return false; } }
function safeColor(v, fb) { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fb; }
function getPrimaryOffer(product) { if (!product || !Array.isArray(product.affiliate_offers)) return null; return product.affiliate_offers.find(o => o && typeof o.store_name === 'string' && isValidExternalURL(o.affiliate_url)) || null; }
function deduplicateProducts(list) {
    if (!Array.isArray(list)) return [];
    const map = new Map();
    list.forEach(p => { if (!p) return; const k = p.id != null ? `id:${p.id}` : (p.slug ? `slug:${p.slug}` : null); if (k && !map.has(k)) map.set(k, p); });
    return Array.from(map.values());
}
function showGridMessage(grid, msg) { if (!grid) return; grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;"><p>${escapeHTML(msg)}</p></div>`; }

function renderProductCard(product) {
    if (!product || typeof product !== 'object') return '';
    const title = escapeHTML(product.title || 'Untitled');
    let id = product.slug ? `${encodeURIComponent(product.slug)}` : (product.id != null ? `id-${encodeURIComponent(product.id)}` : '');
    const hasLink = Boolean(id);
    const productUrl = hasLink ? `/product/${id}` : '#';
    const disabledAttr = hasLink ? '' : 'aria-disabled="true" tabindex="-1" style="pointer-events:none;opacity:0.6;"';
    const imageSrc = isValidURL(product.image_url) ? escapeHTML(product.image_url) : 'assets/icon-192.png';
    
    const r = Number(product.rating);
    const rating = Number.isFinite(r) && r > 0 && r <= 5 ? r : null;
    const rc = Number(product.reviews_count);
    const reviewCount = Number.isInteger(rc) && rc >= 0 ? rc : 0;
    const ratingText = rating !== null ? `★ ${rating.toFixed(1)} (${reviewCount})` : 'Not yet rated';
    
    let timerHtml = '';
    if (product.sale_end_date) {
        const endDate = new Date(product.sale_end_date).getTime();
        if (endDate > new Date().getTime()) {
            timerHtml = `<div class="card-timer" data-endtime="${product.sale_end_date}">⏳ Calculating...</div>`;
        }
    }

    const primaryOffer = getPrimaryOffer(product);
    const networks = (typeof CONFIG !== 'undefined' && CONFIG.networks) ? CONFIG.networks : {};
    let cta = '';

    if (primaryOffer) {
        const storeKey = primaryOffer.store_name.toLowerCase();
        const cfg = networks[storeKey] ?? networks[primaryOffer.store_name] ?? { name: primaryOffer.store_name, brandColor: '#2563eb', textColor: '#ffffff' };
        const bg = safeColor(cfg.brandColor, '#2563eb');
        const fg = safeColor(cfg.textColor, '#ffffff');
        const storeName = escapeHTML(cfg.name || primaryOffer.store_name);
        const affUrl = escapeHTML(primaryOffer.affiliate_url);
        const pid = escapeHTML(String(product.id ?? ''));

        const currencySymbols = { USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ' };
        const offerCurrency = (primaryOffer.currency || 'USD').toUpperCase();
        const offerSymbol = currencySymbols[offerCurrency] || offerCurrency + ' ';
        
        const basePrice = parseFloat(primaryOffer.price) || 0;
        const salePrice = parseFloat(primaryOffer.sale_price) || 0;
        const commissionRate = parseFloat(primaryOffer.commission_rate) || 0;
        
        const now = new Date();
        const isSaleActive = product.sale_end_date && new Date(product.sale_end_date) > now;

        let finalPrice = basePrice;
        let priceDisplay = '';

        if (isSaleActive && salePrice > 0) {
            const finalSalePrice = commissionRate > 0 ? salePrice + (salePrice * (commissionRate / 100)) : salePrice;
            const finalOriginalPrice = commissionRate > 0 ? basePrice + (basePrice * (commissionRate / 100)) : basePrice;
            
            priceDisplay = `
                <div style="margin-bottom:5px; display:flex; align-items:center; gap:8px;">
                    <span style="text-decoration:line-through; color:#94A3B8; font-size:0.9rem;">${offerSymbol}${finalOriginalPrice.toFixed(2)}</span>
                    <span style="font-weight:bold; color:#FF5A3C; font-size:1.2rem;">${offerSymbol}${finalSalePrice.toFixed(2)}</span>
                </div>`;
        } else {
            finalPrice = commissionRate > 0 ? basePrice + (basePrice * (commissionRate / 100)) : basePrice;
            priceDisplay = `<div style="font-weight:bold; color:#1E1B4B; margin-bottom:5px;">${offerSymbol}${finalPrice.toFixed(2)}</div>`;
        }

        cta = `
               ${priceDisplay}
               <a href="${affUrl}" target="_blank" rel="noopener noreferrer sponsored"
                 class="btn-check-price js-affiliate-link"
                 style="background-color:${bg};color:${fg};"
                 data-store="${storeName}" data-product-id="${pid}" data-url="${affUrl}">
                 Check Price on ${storeName}
               </a>`;
    } else {
        cta = `<a href="${productUrl}" ${disabledAttr} class="btn-check-price" style="background:#64748B;">View Details</a>`;
    }
    const badge = product.badge ? `<span class="card-badge">${escapeHTML(product.badge)}</span>` : '';

    return `
        <div class="product-card">
            ${badge}
            <div class="card-img-wrap">
                <a href="${productUrl}" ${disabledAttr}>
                    <img src="${imageSrc}" alt="${title}" loading="lazy" class="product-thumb">
                </a>
            </div>
            <div class="card-body">
                <a href="${productUrl}" ${disabledAttr} class="card-title">${title}</a>
                <div class="card-rating">${escapeHTML(ratingText)}</div>
                ${timerHtml}
                ${cta}
            </div>
        </div>`;
}

function renderFlashCard(product) {
    const title = escapeHTML(product.title || 'Untitled');
    const productUrl = `/product/${encodeURIComponent(product.slug)}`;
    const imageSrc = isValidURL(product.image_url) ? escapeHTML(product.image_url) : 'assets/icon-192.png';
    
    const primaryOffer = getPrimaryOffer(product) || {};
    const currencySymbols = { USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ' };
    const sym = currencySymbols[(primaryOffer.currency || 'USD').toUpperCase()] || '$';
    
    const basePrice = parseFloat(primaryOffer.price) || 0;
    const salePrice = parseFloat(primaryOffer.sale_price) || 0;
    const commissionRate = parseFloat(primaryOffer.commission_rate) || 0;
    
    const isSaleActive = product.sale_end_date && new Date(product.sale_end_date) > new Date();
    const finalPrice = (isSaleActive && salePrice > 0) 
        ? (commissionRate > 0 ? salePrice + (salePrice * (commissionRate / 100)) : salePrice)
        : (commissionRate > 0 ? basePrice + (basePrice * (commissionRate / 100)) : basePrice);

    return `
        <a href="${productUrl}" class="special-deal-card flash-card">
            <div class="img-box">
                <img src="${imageSrc}" alt="${title}">
            </div>
            <div class="info-box">
                <div class="price">${sym}${finalPrice.toFixed(2)}</div>
                <div class="title">${title}</div>
                <div class="card-timer" data-endtime="${product.sale_end_date}">⏳ Calculating...</div>
            </div>
        </a>
    `;
}

function renderProductsGrid(products, grid) {
    if (!grid) return;
    if (!products || products.length === 0) {
        showGridMessage(grid, 'No products found in this category.');
        return;
    }
    grid.innerHTML = products.map(renderProductCard).join('');
    grid.querySelectorAll('img.product-thumb').forEach(img => {
        img.addEventListener('error', function () { this.src = 'assets/icon-192.png'; }, { once: true });
    });
}

setInterval(() => {
    let flashSaleChanged = false;
    document.querySelectorAll('.card-timer').forEach(el => {
        const endTime = new Date(el.dataset.endtime).getTime();
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance < 0) {
            if (el.innerHTML !== "❌ EXPIRED") {
                el.innerHTML = "❌ EXPIRED";
                el.style.background = "#F1F5F9";
                el.style.color = "#64748B";
                el.style.borderColor = "#E2E8F0";
                if (el.closest('.flash-card')) flashSaleChanged = true;
            }
        } else {
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            if (days > 0) {
                el.innerHTML = `⏳ ${days}d ${hours}h ${minutes}m`;
            } else {
                el.innerHTML = `🔥 ${hours}h ${minutes}m ${seconds}s`;
            }
        }
    });

    if (flashSaleChanged) {
        setTimeout(() => loadHomepageProducts(), 2000);
    }
}, 1000);

// ⭐ Fireworks Logic ⭐
let fireworksInterval;
function startFireworks() {
    const canvas = document.getElementById('fireworksCanvas');
    if (!canvas || typeof confetti === 'undefined') return;
    
    const myConfetti = confetti.create(canvas, { resize: true, useWorker: true });
    
    clearInterval(fireworksInterval);
    fireworksInterval = setInterval(() => {
        const type = Math.random() > 0.5 ? 'rocket' : 'sparkler';
        if (type === 'rocket') {
            myConfetti({
                particleCount: 40, spread: 70, origin: { x: Math.random() * 0.8 + 0.1, y: Math.random() * 0.5 + 0.1 },
                colors: ['#fbbf24', '#ef4444', '#3b82f6', '#ffffff', '#ff8c00'], scalar: 1.2
            });
        } else {
            myConfetti({
                particleCount: 15, angle: 90, spread: 60, origin: { x: Math.random() * 0.8 + 0.1, y: 1 },
                colors: ['#fbbf24', '#ffffff'], startVelocity: 45, gravity: 1.2, scalar: 0.8
            });
        }
    }, 800);
}
function stopFireworks() { clearInterval(fireworksInterval); }

window.scrollFlash = function(direction) {
    const container = document.getElementById('flashSaleScroll');
    const scrollAmount = 300;
    if (direction === 'left') container.scrollLeft -= scrollAmount;
    else container.scrollLeft += scrollAmount;
};

window.selectCategory = async function(catSlug, element) {
    document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');
    
    const titleEl = document.getElementById('productSectionTitle');
    const grid = document.getElementById('productGrid');
    
    if (titleEl) {
        titleEl.innerHTML = (catSlug === 'all') ? 'For You' : catSlug.charAt(0).toUpperCase() + catSlug.slice(1).replace('-', ' ');
    }
    
    showGridMessage(grid, 'Loading products...');

    try {
        if (catSlug === 'all') {
            const data = await API.getHomepageProducts();
            const raw = [...(data.featured ?? []), ...(data.trending ?? []), ...(data.latest ?? [])];
            const allProducts = deduplicateProducts(raw).filter(p => p.is_available !== false);
            const now = new Date();
            const normalProducts = allProducts.filter(p => {
                const endDate = p.sale_end_date ? new Date(p.sale_end_date) : null;
                return !(endDate && endDate > now);
            });
            renderProductsGrid(normalProducts, grid);
        } else {
            const products = await API.searchProducts({ category: catSlug });
            renderProductsGrid(products.filter(p => p.is_available !== false), grid);
        }
    } catch (err) {
        showGridMessage(grid, 'Failed to load products.');
    }
};

async function loadHomepageProducts() {
    const grid = document.getElementById('productGrid');
    const flashScroll = document.getElementById('flashSaleScroll');
    const flashSection = document.getElementById('flashSaleSection');
    if (!grid) return;

    try {
        if (typeof API === 'undefined' || !API.getHomepageProducts) throw new Error('API missing');
        
        const { data: settings } = await window.supabaseClient.from('site_settings').select('*').eq('id', 1).single();
        
        if (settings && document.getElementById('specialDealTitle')) {
            const spTitle = document.getElementById('specialDealTitle');
            spTitle.innerText = settings.special_deal_title || 'First order deal';
            spTitle.style.fontFamily = settings.title_font_family || 'Poppins, sans-serif';
            spTitle.style.fontSize = settings.title_font_size || '2rem';
            spTitle.style.fontWeight = settings.title_font_weight || '800';
            spTitle.style.fontStyle = settings.title_font_style || 'normal';
        }
        
        if (settings && document.getElementById('flashSaleTitle')) {
            const flTitle = document.getElementById('flashSaleTitle');
            flTitle.innerText = settings.flash_title_text || 'Mega Sale 11.11';
            flTitle.style.fontFamily = settings.flash_title_font_family || 'Poppins, sans-serif';
            flTitle.style.fontSize = settings.flash_title_font_size || '2rem';
            flTitle.style.fontWeight = settings.flash_title_font_weight || '900';
            flTitle.style.fontStyle = settings.flash_title_font_style || 'normal';
        }

        const data = await API.getHomepageProducts();
        const raw = [...(data.featured ?? []), ...(data.trending ?? []), ...(data.latest ?? [])];
        const allProducts = deduplicateProducts(raw).filter(p => p.is_available !== false);

        const now = new Date();
        const flashSaleProducts = [];
        const normalProducts = [];

        allProducts.forEach(p => {
            const endDate = p.sale_end_date ? new Date(p.sale_end_date) : null;
            if (endDate && endDate > now) {
                flashSaleProducts.push(p);
            } else {
                normalProducts.push(p);
            }
        });

        if (flashSaleProducts.length > 0) {
            flashSection.style.display = 'flex';
            if (!settings || !settings.flash_title_text) {
                 document.getElementById('flashSaleTitle').innerText = flashSaleProducts[0].event_name || 'Mega Sale 11.11';
            }
            flashScroll.innerHTML = flashSaleProducts.map(renderFlashCard).join('');
            startFireworks(); 
        } else {
            flashSection.style.display = 'none';
            stopFireworks(); 
        }

        renderProductsGrid(normalProducts, grid);
        
        if (settings) {
            const { data: specialProducts } = await window.supabaseClient.from('products').select('*, affiliate_offers(*)').eq('is_special_deal', true).eq('is_available', true);
            const container = document.getElementById('specialDealScroll');
            const section = document.getElementById('specialDealSection');
            if (specialProducts && specialProducts.length > 0) {
                section.style.display = 'flex'; 
                container.innerHTML = specialProducts.map(p => {
                    const offer = p.affiliate_offers?.[0] || {};
                    const sym = { USD: '$', PKR: 'Rs. ', EUR: '€' }[(offer.currency || 'USD').toUpperCase()] || '$';
                    const finalPrice = (parseFloat(offer.price) || 0) + ((parseFloat(offer.price) || 0) * ((parseFloat(offer.commission_rate) || 0) / 100));
                    return `
                        <a href="/product/${encodeURIComponent(p.slug)}" class="special-deal-card">
                            <div class="img-box"><img src="${p.image_url || '/assets/icon-192.png'}" alt="${p.title}"></div>
                            <div class="info-box"><div class="price">${sym}${finalPrice.toFixed(2)}</div><div class="title">${p.title}</div></div>
                        </a>`;
                }).join('');
            } else { section.style.display = 'none'; }
        }

    } catch (err) {
        console.error('Load failed:', err);
        showGridMessage(grid, 'Products could not be loaded. Please refresh.');
    }
}

function handleSearch() {
    const input = document.getElementById('searchInput');
    const select = document.getElementById('searchCategory'); // Yeh hidden input hai
    if (!input) return;
    const q = input.value.trim();
    const cat = select ? select.value : 'all';
    
    if (q) {
        let url = `search.html?q=${encodeURIComponent(q)}`;
        // Agar category 'all' nahi hai, toh URL mein category add karo
        if (cat !== 'all') {
            url += `&cat=${encodeURIComponent(cat)}`;
        }
        window.location.href = url;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadHomepageProducts();
    const btn = document.getElementById('searchBtn');
    const input = document.getElementById('searchInput');
    if (btn) btn.addEventListener('click', handleSearch);
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') handleSearch(); });

    // ⭐ Custom Dropdown Logic ⭐
    const catBtn = document.getElementById('categoryDropdownBtn');
    const catMenu = document.getElementById('categoryDropdownMenu');
    const catText = document.getElementById('categoryDropdownText');
    const catInput = document.getElementById('searchCategory');

    if (catBtn && catMenu) {
        // Dropdown toggle on click
        catBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            catMenu.classList.toggle('show');
        });

        // Dropdown item selection
        catMenu.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', function(e) {
                e.stopPropagation();
                const val = this.getAttribute('data-value');
                const text = this.innerText;
                
                // Update button text and hidden input value
                catText.innerText = text;
                catInput.value = val;
                
                // Update active state in dropdown list
                catMenu.querySelectorAll('li').forEach(item => item.classList.remove('active'));
                this.classList.add('active');
                
                // Close menu
                catMenu.classList.remove('show');
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!catBtn.contains(e.target) && !catMenu.contains(e.target)) {
                catMenu.classList.remove('show');
            }
        });
    }
});

// ⭐ App Download Popup Logic ⭐
function closeAppPopup() {
    document.getElementById('appDownloadPopup').style.display = 'none';
    // Agar aap chahein ke user ise dobara na dekhe (24 ghante ke liye)
    localStorage.setItem('appPopupClosed', 'true');
}

function redirectToStore() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // 🔴 YAHAN APNE APP STORES KE ASAL LINKS DAALEIN 🔴
    const playStoreLink = 'https://play.google.com/store/apps/details?id=your.package.name';
    const appStoreLink = 'https://apps.apple.com/app/idYOUR_APP_ID';
    const appGalleryLink = 'https://appgallery.huawei.com/app/C_YOUR_APP_ID';

    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        window.location.href = appStoreLink; // Apple App Store
    } else if (/Huawei|HONOR/i.test(userAgent)) {
        window.location.href = appGalleryLink; // Huawei AppGallery
    } else if (/android/i.test(userAgent)) {
        window.location.href = playStoreLink; // Google Play Store
    } else {
        // Fallback
        window.location.href = playStoreLink;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const popup = document.getElementById('appDownloadPopup');
    const desktopContent = document.getElementById('desktopAppContent');
    const mobileContent = document.getElementById('mobileAppContent');
    
    // Check karein ke user ne pehle popup band kiya tha ya nahi
    if (!localStorage.getItem('appPopupClosed') && popup) {
        
        // 3 second baad popup dikhayein
        setTimeout(() => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

            if (isMobile) {
                mobileContent.style.display = 'block';
            } else {
                desktopContent.style.display = 'block';
            }
            
            popup.style.display = 'block';
        }, 3000); // 3000 = 3 seconds
    }
});
