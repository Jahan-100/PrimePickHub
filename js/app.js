/**
 * PrimePickHub Homepage Renderer + Realtime + Notifications + PWA + Tracking
 */

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function isValidExternalURL(url) { if (typeof url !== 'string') return false; try { const p = new URL(url); return p.protocol === 'https:' || p.protocol === 'http:'; } catch { return false; } }
function isValidURL(url) { if (!url || typeof url !== 'string') return false; try { const p = new URL(url, window.location.origin); return p.protocol === 'http:' || p.protocol === 'https:'; } catch { return false; } }
function safeColor(v, fb) { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fb; }

// ⭐ UPDATE: Hamesha Main Offer (Base Price) ko priority dein
function getPrimaryOffer(product) { 
    if (!product || !Array.isArray(product.affiliate_offers)) return null; 
    const offers = product.affiliate_offers.filter(o => o && isValidExternalURL(o.affiliate_url));
    const defaultOffer = offers.find(o => !o.variation_name);
    
    // Return main offer if it exists, otherwise fallback to first available
    return defaultOffer || offers[0] || null;
}

function deduplicateProducts(list) {
    if (!Array.isArray(list)) return [];
    const map = new Map();
    list.forEach(p => { if (!p) return; const k = p.id != null ? `id:${p.id}` : (p.slug ? `slug:${p.slug}` : null); if (k && !map.has(k)) map.set(k, p); });
    return Array.from(map.values());
}
function showGridMessage(grid, msg) { if (!grid) return; grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;"><p>${escapeHTML(msg)}</p></div>`; }

function renderDynamicCategories(allProducts) {
    const masterCats = (typeof CONFIG !== 'undefined' && CONFIG.categories) ? CONFIG.categories : [];
    const dbCats = [...new Set(allProducts.map(p => p.category_slug).filter(Boolean))];
    const activeCats = masterCats.filter(c => c.slug === 'all' || dbCats.includes(c.slug));
    const catContainer = document.getElementById('categoryScrollContainer');
    if (catContainer) {
        catContainer.innerHTML = activeCats.map(c => `
            <a href="javascript:void(0)" onclick="selectCategory('${c.slug}', this)" class="category-item ${c.slug === 'all' ? 'active' : ''}" data-cat="${c.slug}">
                <div class="cat-icon" ${c.slug === 'all' ? 'style="color: #EF4444;"' : ''}>${c.icon}</div>
                <span>${c.name}</span>
            </a>
        `).join('');
    }
    const dropdownMenu = document.getElementById('categoryDropdownMenu');
    if (dropdownMenu) {
        dropdownMenu.innerHTML = activeCats.map(c => `
            <li data-value="${c.slug}" class="${c.slug === 'all' ? 'active' : ''}" onclick="selectCatDropdown('${c.slug}', '${c.name}', this)">${c.name}</li>
        `).join('');
    }
}

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
        
        let finalBasePrice = basePrice;
        let finalSalePrice = salePrice;

        if (commissionRate > 0) {
            finalBasePrice = basePrice + (basePrice * (commissionRate / 100));
            if (salePrice > 0) {
                finalSalePrice = salePrice + (salePrice * (commissionRate / 100));
            }
        }
        
        let priceDisplay = '';

        if (salePrice > 0) {
            priceDisplay = `
                <div style="margin-bottom:5px; display:flex; align-items:center; gap:8px;">
                    <span style="text-decoration:line-through; color:#94A3B8; font-size:0.9rem;">${offerSymbol}${finalBasePrice.toFixed(2)}</span>
                    <span style="font-weight:bold; color:#FF5A3C; font-size:1.2rem;">${offerSymbol}${finalSalePrice.toFixed(2)}</span>
                </div>`;
        } else {
            priceDisplay = `<div style="font-weight:bold; color:#1E1B4B; margin-bottom:5px;">${offerSymbol}${finalBasePrice.toFixed(2)}</div>`;
        }

        cta = `
               ${priceDisplay}
               <a href="${affUrl}" target="_blank" rel="noopener noreferrer sponsored" class="btn-check-price js-affiliate-link" style="background-color:${bg};color:${fg};" data-store="${storeName}" data-product-id="${pid}" data-url="${affUrl}">
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
    
    let finalBasePrice = basePrice;
    let finalSalePrice = salePrice;

    if (commissionRate > 0) {
        finalBasePrice = basePrice + (basePrice * (commissionRate / 100));
        if (salePrice > 0) {
            finalSalePrice = salePrice + (salePrice * (commissionRate / 100));
        }
    }
    
    let priceDisplay = '';
    if (salePrice > 0) {
        priceDisplay = `
            <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; width: 100%;">
                <div style="display:flex; align-items:center; gap:4px;">
                    <span style="text-decoration:line-through; color:#94A3B8; font-size:0.75rem;">${sym}${finalBasePrice.toFixed(2)}</span>
                    <span style="font-weight:bold; color:#FF5A3C; font-size:0.95rem;">${sym}${finalSalePrice.toFixed(2)}</span>
                </div>
            </div>`;
    } else {
        priceDisplay = `<div class="price" style="font-size:0.95rem;">${sym}${finalBasePrice.toFixed(2)}</div>`;
    }

    return `
        <a href="${productUrl}" class="special-deal-card flash-card">
            <div class="img-box">
                <img src="${imageSrc}" alt="${title}">
            </div>
            <div class="info-box">
                ${priceDisplay}
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
            if (days > 0) { el.innerHTML = `⏳ ${days}d ${hours}h ${minutes}m`; } 
            else { el.innerHTML = `🔥 ${hours}h ${minutes}m ${seconds}s`; }
        }
    });
    if (flashSaleChanged) setTimeout(() => loadHomepageProducts(), 2000);
}, 1000);

let fireworksInterval;
function startFireworks() {
    const canvas = document.getElementById('fireworksCanvas');
    if (!canvas || typeof confetti === 'undefined') return;
    const myConfetti = confetti.create(canvas, { resize: true, useWorker: true });
    clearInterval(fireworksInterval);
    fireworksInterval = setInterval(() => {
        const type = Math.random() > 0.5 ? 'rocket' : 'sparkler';
        if (type === 'rocket') {
            myConfetti({ particleCount: 40, spread: 70, origin: { x: Math.random() * 0.8 + 0.1, y: Math.random() * 0.5 + 0.1 }, colors: ['#fbbf24', '#ef4444', '#3b82f6', '#ffffff', '#ff8c00'], scalar: 1.2 });
        } else {
            myConfetti({ particleCount: 15, angle: 90, spread: 60, origin: { x: Math.random() * 0.8 + 0.1, y: 1 }, colors: ['#fbbf24', '#ffffff'], startVelocity: 45, gravity: 1.2, scalar: 0.8 });
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
        const catName = (typeof CONFIG !== 'undefined' && CONFIG.categories) ? (CONFIG.categories.find(c => c.slug === catSlug)?.name || catSlug) : catSlug;
        titleEl.innerHTML = (catSlug === 'all') ? 'For You' : catName;
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
    const floatingAppIcon = document.getElementById('floatingAppIcon');
    if (!grid) return;

    try {
        if (typeof API === 'undefined' || !API.getHomepageProducts) throw new Error('API missing');
        
        const { data: settings } = await window.supabaseClient.from('site_settings').select('*').eq('id', 1).maybeSingle();
        
        if (settings) {
            const showApp = settings.show_app_download !== false;
            const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

            if (showApp && !isPWA) {
                if (floatingAppIcon) floatingAppIcon.style.display = 'flex';
                if (!sessionStorage.getItem('appPopupShown')) {
                    setTimeout(() => {
                        toggleAppPopup();
                        sessionStorage.setItem('appPopupShown', 'true');
                    }, 3000);
                }
            } else {
                if (floatingAppIcon) floatingAppIcon.style.display = 'none';
                const popup = document.getElementById('appDownloadPopup');
                const overlay = document.getElementById('appPopupOverlay');
                if (popup) popup.style.display = 'none';
                if (overlay) overlay.style.display = 'none';
            }
        }

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

        renderDynamicCategories(allProducts);

        const now = new Date();
        const flashSaleProducts = [];
        const normalProducts = [];

        allProducts.forEach(p => {
            const endDate = p.sale_end_date ? new Date(p.sale_end_date) : null;
            if (endDate && endDate > now) flashSaleProducts.push(p);
            else normalProducts.push(p);
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
                    const primaryOffer = getPrimaryOffer(p) || {};
                    const sym = { USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ' }[(primaryOffer.currency || 'USD').toUpperCase()] || '$';
                    
                    const basePrice = parseFloat(primaryOffer.price) || 0;
                    const salePrice = parseFloat(primaryOffer.sale_price) || 0;
                    const commissionRate = parseFloat(primaryOffer.commission_rate) || 0;
                    
                    let finalBasePrice = basePrice;
                    let finalSalePrice = salePrice;

                    if (commissionRate > 0) {
                        finalBasePrice = basePrice + (basePrice * (commissionRate / 100));
                        if (salePrice > 0) {
                            finalSalePrice = salePrice + (salePrice * (commissionRate / 100));
                        }
                    }
                    
                    let priceDisplay = '';
                    if (salePrice > 0) {
                        priceDisplay = `<div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
                                            <span style="text-decoration:line-through; color:#94A3B8; font-size:0.75rem;">${sym}${finalBasePrice.toFixed(2)}</span>
                                            <span class="price" style="margin-bottom:0;">${sym}${finalSalePrice.toFixed(2)}</span>
                                        </div>`;
                    } else {
                        priceDisplay = `<div class="price">${sym}${finalBasePrice.toFixed(2)}</div>`;
                    }
                    
                    return `
                        <a href="/product/${encodeURIComponent(p.slug)}" class="special-deal-card">
                            <div class="img-box"><img src="${p.image_url || '/assets/icon-192.png'}" alt="${p.title}"></div>
                            <div class="info-box">
                                ${priceDisplay}
                                <div class="title">${p.title}</div>
                            </div>
                        </a>`;
                }).join('');
            } else { section.style.display = 'none'; }
        }
    } catch (err) {
        console.error('Load failed:', err);
    }
}

function handleSearch() {
    const input = document.getElementById('searchInput');
    const select = document.getElementById('searchCategory');
    if (!input) return;
    const q = input.value.trim();
    const cat = select ? select.value : 'all';
    
    if (q) {
        let url = `search.html?q=${encodeURIComponent(q)}`;
        if (cat !== 'all') url += `&cat=${encodeURIComponent(cat)}`;
        window.location.href = url;
    }
}

let userDeletedNotifs = JSON.parse(localStorage.getItem('deleted_notifs') || '[]');
let currentNotifs = [];

window.toggleNotifPanel = function(e) {
    if (e) e.stopPropagation();
    const panel = document.getElementById('notifPanel');
    if(panel) panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

async function loadNotifications() {
    if (!window.supabaseClient) return;
    const { data, error } = await window.supabaseClient.from('app_notifications').select('*').order('created_at', { ascending: false }).limit(20);
    
    if (!error && data) {
        currentNotifs = data.filter(n => !userDeletedNotifs.includes(n.id));
        renderNotifications();
    }
}

function renderNotifications() {
    const list = document.getElementById('notifList');
    const badge = document.getElementById('notifBadge');
    if (!list) return;

    if (currentNotifs.length === 0) {
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #94A3B8; font-size: 0.85rem;">No new notifications</div>';
        if(badge) badge.style.display = 'none';
        return;
    }

    if(badge) {
        badge.style.display = 'flex';
        badge.innerText = currentNotifs.length;
    }

    list.innerHTML = currentNotifs.map(n => `
        <div class="notif-item" id="notif-${n.id}">
            <div>
                <h4>${escapeHTML(n.title)}</h4>
                <p>${escapeHTML(n.message)}</p>
                <span style="font-size: 0.65rem; color: #94A3B8;">${new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <button class="notif-del" onclick="deleteNotif('${n.id}')"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `).join('');
}

window.deleteNotif = function(id) {
    userDeletedNotifs.push(id);
    localStorage.setItem('deleted_notifs', JSON.stringify(userDeletedNotifs));
    currentNotifs = currentNotifs.filter(n => n.id !== id);
    renderNotifications();
}

window.clearAllNotifs = function(e) {
    if(e) e.stopPropagation();
    currentNotifs.forEach(n => { if(!userDeletedNotifs.includes(n.id)) userDeletedNotifs.push(n.id); });
    localStorage.setItem('deleted_notifs', JSON.stringify(userDeletedNotifs));
    currentNotifs = [];
    renderNotifications();
}

function showBrowserNotification(title, body) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
        new Notification(title, { body: body, icon: '/assets/icon-192.png' });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") new Notification(title, { body: body, icon: '/assets/icon-192.png' });
        });
    }
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

window.triggerPWAInstall = function() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                toggleAppPopup();
            }
            deferredPrompt = null;
        });
    } else {
        alert("To install: Tap the browser menu (3 dots) and select 'Add to Home screen'.");
    }
}

window.toggleAppPopup = function() {
    const popup = document.getElementById('appDownloadPopup');
    const overlay = document.getElementById('appPopupOverlay');
    const desktopContent = document.getElementById('desktopAppContent');
    const mobileContent = document.getElementById('mobileAppContent');
    
    if (!popup || !overlay) return;

    if (popup.style.display === 'none' || popup.style.display === '') {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

        if (isMobile) {
            if(mobileContent) mobileContent.style.display = 'block';
            if(desktopContent) desktopContent.style.display = 'none';
        } else {
            if(desktopContent) desktopContent.style.display = 'block';
            if(mobileContent) mobileContent.style.display = 'none';
        }

        popup.style.display = 'block';
        overlay.style.display = 'block';
    } else {
        popup.style.display = 'none';
        overlay.style.display = 'none';
    }
}

function redirectToStore() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const playStoreLink = 'https://play.google.com/store/apps/details?id=your.package.name';
    const appStoreLink = 'https://apps.apple.com/app/idYOUR_APP_ID';
    const appGalleryLink = 'https://appgallery.huawei.com/app/CYOUR_APP_ID';

    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) window.location.href = appStoreLink;
    else if (/Huawei|HONOR/i.test(userAgent)) window.location.href = appGalleryLink;
    else window.location.href = playStoreLink;
}

let realtimeTimeout;
function triggerRealtimeUpdate(payload) {
    clearTimeout(realtimeTimeout);
    realtimeTimeout = setTimeout(() => { loadHomepageProducts(); }, 500); 
}

function setupRealtime() {
    if (!window.supabaseClient) return;

    window.supabaseClient
        .channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
            triggerRealtimeUpdate(payload);
            if (payload.eventType === 'INSERT') showBrowserNotification("New Product Added! 🛍️", payload.new.title);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_offers' }, triggerRealtimeUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, triggerRealtimeUpdate)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_notifications' }, (payload) => {
            loadNotifications(); 
            showBrowserNotification(payload.new.title, payload.new.message);
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') console.log('✅ Realtime connected! Live updates are ON.');
        });
}

async function trackVisitor() {
    if (!window.supabaseClient) return;
    let visitorId = localStorage.getItem('visitor_id');
    if (!visitorId) {
        visitorId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        localStorage.setItem('visitor_id', visitorId);
    }
    await window.supabaseClient.from('website_visitors').upsert({
        visitor_id: visitorId,
        last_seen: new Date().toISOString()
    }, { onConflict: 'visitor_id' });
}

async function trackActiveApp() {
    if (!window.supabaseClient) return;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (!isPWA) return;

    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        localStorage.setItem('device_id', deviceId);
    }
    await window.supabaseClient.from('active_app_installs').upsert({
        device_id: deviceId,
        last_active: new Date().toISOString()
    }, { onConflict: 'device_id' });
}

document.addEventListener('DOMContentLoaded', () => {
    trackVisitor();
    trackActiveApp();
    
    loadHomepageProducts();
    setupRealtime(); 
    loadNotifications();

    setInterval(() => {
        const popup = document.getElementById('appDownloadPopup');
        if (document.getElementById('productGrid') && (!popup || popup.style.display !== 'block')) {
            loadHomepageProducts();
        }
    }, 15000);

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => console.log('✅ Service Worker registered! PWA is ready.'))
                .catch(err => console.log('❌ Service Worker failed:', err));
        });
    }

    const btn = document.getElementById('searchBtn');
    const input = document.getElementById('searchInput');
    if (btn) btn.addEventListener('click', handleSearch);
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') handleSearch(); });

    const catBtn = document.getElementById('categoryDropdownBtn');
    const catMenu = document.getElementById('categoryDropdownMenu');
    if (catBtn && catMenu && typeof toggleCatDropdown === 'undefined') {
        catBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            catMenu.style.display = catMenu.style.display === 'block' ? 'none' : 'block';
        });
    }

    setTimeout(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, 5000);

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.notif-wrapper')) {
            const panel = document.getElementById('notifPanel');
            if(panel) panel.style.display = 'none';
        }
    });

    function hideSplash() {
        var splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('hidden');
            document.body.classList.remove('app-loading');
            setTimeout(() => { splash.style.display = 'none'; }, 800); 
        }
    }
    setTimeout(hideSplash, 1500);
    setTimeout(() => { 
        var splash = document.getElementById('splash-screen');
        if (splash && !splash.classList.contains('hidden')) hideSplash(); 
    }, 3500);
});
