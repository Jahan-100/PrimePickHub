/**
 * PrimePickHub Homepage Renderer — v89 (Fast Image Proxy)
 */

if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }

document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href && !link.href.includes('#') && !link.href.includes('javascript:') && link.target !== '_blank') {
        if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
            sessionStorage.setItem('homeScrollY', window.scrollY);
        }
    }
}, { capture: true });

function safeColor(v, fb) { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fb; }
window.handleImageLoad = function(img) { if (img.decode) { img.decode().then(() => { img.style.opacity = 1; }).catch(() => { img.style.opacity = 1; }); } else { img.style.opacity = 1; } };

// ⭐ IMAGE OPTIMIZATION PROXY (Fixes blocky/slow images) ⭐
function getOptimizedImage(url, width = 300) {
    if (!url || typeof url !== 'string') return 'assets/icon-192.png?v=4';
    if (url.includes('images.weserv.nl')) return url;
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp`;
}

function hideSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash && splash.style.display !== 'none') {
        splash.classList.add('hidden');
        document.body.classList.remove('app-loading');
        setTimeout(() => { splash.style.display = 'none'; }, 300);
        sessionStorage.setItem('splashShown', 'true');
    }
}

function getProductUrl(product) {
    if (!product) return '#';
    if (product.slug) return `/product/${encodeURIComponent(product.slug)}`;
    if (product.id != null) return `/product.html?id=${encodeURIComponent(product.id)}`;
    return '#';
}

function getPrimaryOffer(product) {
    if (!product || !Array.isArray(product.affiliate_offers)) return null;
    const offers = product.affiliate_offers.filter(o => o && typeof o === 'object' && isValidURL(o.affiliate_url));
    const defaultOffer = offers.find(o => !o.variation_name);
    return defaultOffer || offers[0] || null;
}

function deduplicateProducts(list) {
    if (!Array.isArray(list)) return [];
    const map = new Map();
    list.forEach(p => { if (!p) return; const k = p.id != null ? `id:${p.id}` : (p.slug ? `slug:${p.slug}` : null); if (k && !map.has(k)) map.set(k, p); });
    return Array.from(map.values());
}

function showGridMessage(grid, msg) {
    if (!grid) return;
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;"><p>${escapeHTML(msg)}</p></div>`;
}

function getAllDescendantSlugs(parentSlug, allCats) {
    const slugs = new Set(), visited = new Set();
    function traverse(slug) {
        if (!slug || typeof slug !== 'string') return;
        const norm = slug.trim().toLowerCase();
        if (visited.has(norm)) return;
        visited.add(norm); slugs.add(norm);
        if (!Array.isArray(allCats)) return;
        allCats.forEach(c => {
            if (c && typeof c === 'object' && c.parent && typeof c.parent === 'string' && c.slug && typeof c.slug === 'string') {
                if (c.parent.trim().toLowerCase() === norm) traverse(c.slug);
            }
        });
    }
    traverse(parentSlug); return Array.from(slugs);
}

function getCategoryIcon(cat) {
    if (!cat) return '📦';
    const name = (cat.name || '').toLowerCase().trim();
    let slug = (cat.slug || '').toLowerCase().trim();
    if (name.includes('light')) slug = 'lights';
    if (cat.icon && (cat.icon.startsWith('http') || cat.icon.includes('assets/'))) {
        const iconPath = cat.icon.startsWith('/') ? cat.icon : '/' + cat.icon;
        return `<img src="${iconPath}" alt="${escapeHTML(cat.name)}" style="width:100%; height:100%; object-fit:contain; border-radius:50%; background:#fff;">`;
    }
    let emoji = '🏷️';
    if (name.includes('bag') || name.includes('luggage')) emoji = '👜';
    else if (name.includes('jewel') || name.includes('watch')) emoji = '💍';
    else if (name.includes('electronic') || name.includes('tech')) emoji = '📱';
    else if (name.includes('cloth') || name.includes('fashion')) emoji = '👗';
    else if (name.includes('shoe')) emoji = '👟';
    else if (name.includes('light')) emoji = '💡';
    else if (name.includes('glass') || name.includes('eyewear')) emoji = '🕶️';
    else if (name.includes('beauty') || name.includes('makeup')) emoji = '💄';
    else if (name.includes('sport')) emoji = '🏋️';
    else if (name.includes('toy') || name.includes('game')) emoji = '🧸';
    else if (name.includes('car') || name.includes('auto')) emoji = '🚗';
    else if (name.includes('home') || name.includes('kitchen')) emoji = '🛋️';
    else if (name.includes('accessories')) emoji = '💍';
    else if (name.includes('belt')) emoji = '🩱';
    return `<div style="width:100%; height:100%; position:relative; display:flex; align-items:center; justify-content:center;"><img src="/assets/${slug}-icon.webp" alt="${escapeHTML(cat.name)}" style="width:100%; height:100%; object-fit:contain; border-radius:50%; background:#fff; position:absolute; top:0; left:0;" onerror="if(this.src.includes('.webp')) { this.src = this.src.replace('.webp', '.jpg'); } else if(this.src.includes('.jpg')) { this.src = this.src.replace('.jpg', '.png'); } else { this.style.display='none'; this.nextElementSibling.style.display='flex'; }"><span style="display:none; font-size:2.2rem; align-items:center; justify-content:center; height:100%; width:100%;">${emoji}</span></div>`;
}

let allCategoriesGlobal = [], activeCategoriesSet = new Set(), hoverTimeout, selectedCategorySlug = 'all';

async function fetchActiveCategories() {
    if (!window.supabaseClient) return;
    try {
        const { data, error } = await window.supabaseClient.from('products').select('category_slug');
        if (!error && data) {
            activeCategoriesSet.clear(); activeCategoriesSet.add('all');
            const productCats = new Set(data.map(p => p && p.category_slug && typeof p.category_slug === 'string' ? p.category_slug.trim().toLowerCase() : null).filter(Boolean));
            productCats.forEach(slug => {
                activeCategoriesSet.add(slug);
                let currentSlug = slug;
                while (currentSlug) {
                    const cat = allCategoriesGlobal.find(c => c && c.slug && typeof c.slug === 'string' && c.slug.trim().toLowerCase() === currentSlug);
                    if (cat && cat.parent && typeof cat.parent === 'string' && cat.parent !== 'all') {
                        activeCategoriesSet.add(cat.parent.trim().toLowerCase());
                        currentSlug = cat.parent.trim().toLowerCase();
                    } else break;
                }
            });
        }
    } catch (e) { console.warn("Failed to fetch active categories", e); }
}

async function renderDynamicCategories() {
    try { allCategoriesGlobal = await API.getCategories(); }
    catch(e) { allCategoriesGlobal = (typeof CONFIG !== 'undefined' && CONFIG.categories) ? CONFIG.categories : []; }
    if (!allCategoriesGlobal || allCategoriesGlobal.length === 0) {
        allCategoriesGlobal = (typeof CONFIG !== 'undefined' && CONFIG.categories) ? CONFIG.categories : [];
    }
    await fetchActiveCategories();
    let topCats = allCategoriesGlobal.filter(c => {
        const isTop = !c.parent || c.parent.trim().toLowerCase() === 'all';
        return isTop && activeCategoriesSet.has((c.slug || '').trim().toLowerCase());
    });
    activeCategoriesSet.forEach(slug => {
        if (slug === 'all') return;
        if (!allCategoriesGlobal.find(c => c && c.slug && c.slug.trim().toLowerCase() === slug)) {
            const isSub = allCategoriesGlobal.some(c => c && c.parent && typeof c.parent === 'string' && c.parent.trim().toLowerCase() === slug);
            if (!isSub) topCats.push({ slug, name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), icon: null, parent: null });
        }
    });
    const catContainer = document.getElementById('categoryScrollContainer');
    if (catContainer) {
        catContainer.innerHTML = topCats.map(c => `<a href="javascript:void(0)" class="category-item ${c.slug.trim().toLowerCase() === selectedCategorySlug ? 'active' : ''}" data-slug="${c.slug}"><div class="cat-icon" style="overflow:hidden;" ${c.slug.trim().toLowerCase() === 'all' ? 'data-is-all="true"' : ''}>${c.slug.trim().toLowerCase() === 'all' ? '<span style="color:#EF4444; font-size: 2.2rem; display:flex; align-items:center; justify-content:center; height:100%;">❤️</span>' : getCategoryIcon(c)}</div><span>${c.name}</span></a>`).join('');
        const isHoverDevice = window.matchMedia('(hover: hover)').matches;
        
        catContainer.querySelectorAll('.category-item').forEach(el => {
            if (isHoverDevice) {
                el.addEventListener('mouseenter', function(e) {
                    clearTimeout(hoverTimeout);
                    const catSlug = this.dataset.slug;
                    document.querySelectorAll('#categoryScrollContainer .category-item').forEach(item => item.classList.remove('active'));
                    this.classList.add('active');
                    if (catSlug === 'all') document.getElementById('categoryHoverPanel').style.display = 'none';
                    else renderHoverPanel(catSlug, this);
                });
            }
            el.addEventListener('click', function(e) {
                e.preventDefault();
                const catSlug = this.dataset.slug;
                const panel = document.getElementById('categoryHoverPanel');
                
                selectedCategorySlug = catSlug;

                document.querySelectorAll('#categoryScrollContainer .category-item').forEach(item => item.classList.remove('active'));
                this.classList.add('active');

                if (catSlug === 'all') {
                    panel.style.display = 'none'; panel.dataset.activeSlug = '';
                    loadCategoryProducts('all', 'For You'); return;
                }
                
                const mainCat = allCategoriesGlobal.find(c => c.slug === catSlug);
                const subCats = allCategoriesGlobal.filter(c => c.parent === catSlug && activeCategoriesSet.has(c.slug.toLowerCase()));
                
                if (subCats.length > 0) {
                    if (panel.style.display === 'flex' && panel.dataset.activeSlug === catSlug) {
                        panel.style.display = 'none'; panel.dataset.activeSlug = '';
                        document.querySelector(`#categoryScrollContainer .category-item[data-slug="${selectedCategorySlug}"]`)?.classList.add('active');
                    } else {
                        renderHoverPanel(catSlug, this);
                        panel.dataset.activeSlug = catSlug;
                    }
                } else {
                    panel.style.display = 'none'; panel.dataset.activeSlug = '';
                    loadCategoryProducts(catSlug, mainCat ? mainCat.name : catSlug);
                }
            });
        });
        
        if (isHoverDevice) {
            document.querySelector('.category-nav-wrapper')?.addEventListener('mouseleave', function(e) {
                hoverTimeout = setTimeout(() => {
                    const panel = document.getElementById('categoryHoverPanel');
                    if (panel) panel.style.display = 'none';
                    document.querySelectorAll('#categoryScrollContainer .category-item').forEach(item => item.classList.remove('active'));
                    
                    const defaultCat = document.querySelector(`#categoryScrollContainer .category-item[data-slug="${selectedCategorySlug}"]`) || document.querySelector('#categoryScrollContainer .category-item[data-slug="all"]');
                    if (defaultCat) defaultCat.classList.add('active');
                }, 200);
            });
        }
        
        document.addEventListener('click', function(e) {
            const panel = document.getElementById('categoryHoverPanel');
            if (panel && panel.style.display === 'flex' && !e.target.closest('.category-item') && !e.target.closest('#categoryHoverPanel')) {
                panel.style.display = 'none'; panel.dataset.activeSlug = '';
                document.querySelectorAll('#categoryScrollContainer .category-item').forEach(item => item.classList.remove('active'));
                const target = document.querySelector(`#categoryScrollContainer .category-item[data-slug="${selectedCategorySlug}"]`) || document.querySelector('#categoryScrollContainer .category-item[data-slug="all"]');
                if (target) target.classList.add('active');
            }
        });
    }
    const dropdownMenu = document.getElementById('categoryDropdownMenu');
    if (dropdownMenu) {
        dropdownMenu.innerHTML = topCats.map(c => `<li data-value="${c.slug}" class="${c.slug.trim().toLowerCase() === selectedCategorySlug ? 'active' : ''}" onclick="selectCatDropdown('${c.slug}', '${c.name}', this)">${c.name}</li>`).join('');
    }
}

function renderHoverPanel(mainSlug, targetElement) {
    const panel = document.getElementById('categoryHoverPanel');
    if (!panel) return;
    const subCats = allCategoriesGlobal.filter(c => c.parent === mainSlug && activeCategoriesSet.has(c.slug.toLowerCase()));
    if (subCats.length === 0) { panel.style.display = 'none'; return; }
    panel.style.display = 'flex';
    let html = '';
    subCats.forEach(sub => {
        const minis = allCategoriesGlobal.filter(c => c.parent === sub.slug && activeCategoriesSet.has(c.slug.toLowerCase()));
        html += `<div class="sub-cat-col"><div class="sub-cat-title" data-slug="${sub.slug}" data-name="${escapeHTML(sub.name)}">${escapeHTML(sub.name)}</div>${minis.length > 0 ? `<div class="mini-list">${minis.map(m => `<div class="mini-item" data-slug="${m.slug}" data-name="${escapeHTML(m.name)}">${escapeHTML(m.name)}</div>`).join('')}</div>` : ''}</div>`;
    });
    panel.innerHTML = html;
    
    panel.querySelectorAll('.sub-cat-title').forEach(el => {
        el.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('categoryHoverPanel').style.display = 'none';
            selectedCategorySlug = mainSlug; 
            loadCategoryProducts(this.dataset.slug, this.dataset.name);
        });
    });
    panel.querySelectorAll('.mini-item').forEach(el => {
        el.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('categoryHoverPanel').style.display = 'none';
            selectedCategorySlug = mainSlug;
            loadCategoryProducts(this.dataset.slug, this.dataset.name);
        });
    });
    
    const wrapper = document.querySelector('.category-nav-wrapper');
    const wrapperRect = wrapper.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const targetCenter = (targetRect.left - wrapperRect.left) + (targetRect.width / 2);
    const panelWidth = panel.offsetWidth;
    let leftPos = targetCenter - (panelWidth / 2);
    if (leftPos < 0) leftPos = 0;
    if (leftPos + panelWidth > wrapperRect.width) leftPos = wrapperRect.width - panelWidth;
    panel.style.left = `${leftPos}px`;
    panel.style.top = `${targetRect.bottom - wrapperRect.top - 5}px`;
}

async function loadCategoryProducts(catSlug, catName) {
    const titleEl = document.getElementById('productSectionTitle');
    const grid = document.getElementById('productGrid');
    if (titleEl) { titleEl.innerHTML = catName; titleEl.style.display = 'block'; }
    showGridMessage(grid, 'Loading products...');
    try {
        if (catSlug === 'all') {
            const data = await API.getHomepageProducts();
            const raw = [...(data.featured ?? []), ...(data.trending ?? []), ...(data.latest ?? [])];
            const allProducts = deduplicateProducts(raw).filter(p => p.is_available !== false);
            const now = new Date();
            const normalProducts = allProducts.filter(p => {
                const e1 = p.sale_end_date ? new Date(p.sale_end_date) : null;
                const e2 = p.sale_end_date_2 ? new Date(p.sale_end_date_2) : null;
                return !(e1 && e1 > now) && !(e2 && e2 > now);
            });
            renderProductsGrid(normalProducts, grid);
        } else {
            const fetchSlugs = getAllDescendantSlugs(catSlug, allCategoriesGlobal);
            
            const { data: products, error } = await window.supabaseClient
                .from('products')
                .select('*, affiliate_offers(*)')
                .in('category_slug', fetchSlugs)
                .eq('is_available', true)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            renderProductsGrid((products || []).filter(p => p.is_available !== false), grid);
        }
    } catch (err) { console.error("Product Load Error:", err); showGridMessage(grid, 'Error loading products.'); }
}

function renderProductCard(product, isPriority = false) {
    if (!product || typeof product !== 'object') return '';
    const title = escapeHTML(product.title || 'Untitled');
    const productUrl = getProductUrl(product);
    const hasLink = productUrl !== '#';
    const disabledAttr = hasLink ? '' : 'aria-disabled="true" tabindex="-1" style="pointer-events:none;opacity:0.6;"';
    
    const imageSrc = isValidURL(product.image_url) ? escapeHTML(getOptimizedImage(product.image_url, 300)) : 'assets/icon-192.png?v=4';
    
    const imgPriority = isPriority ? 'fetchpriority="high"' : '';
    const loadingAttr = isPriority ? 'loading="eager"' : 'loading="lazy"';
    const r = Number(product.rating); const rating = Number.isFinite(r) && r > 0 && r <= 5 ? r : null;
    const rc = Number(product.reviews_count); const reviewCount = Number.isInteger(rc) && rc >= 0 ? rc : 0;
    const ratingText = rating !== null ? `★ ${rating.toFixed(1)} (${reviewCount})` : 'Not yet rated';
    let timerHtml = '';
    if (product.sale_end_date) {
        const endDate = new Date(product.sale_end_date).getTime();
        if (endDate > new Date().getTime()) timerHtml = `<div class="card-timer" data-endtime="${product.sale_end_date}">⏳ Calculating...</div>`;
    }
    const primaryOffer = getPrimaryOffer(product);
    const networks = (typeof CONFIG !== 'undefined' && CONFIG.networks) ? CONFIG.networks : {};
    let cta = '';
    if (primaryOffer) {
        const storeKey = String(primaryOffer.store_name || 'amazon').toLowerCase();
        const cfg = networks[storeKey] ?? networks[primaryOffer.store_name || ''] ?? { name: primaryOffer.store_name || 'Store', brandColor: '#2563eb', textColor: '#ffffff' };
        let bg = safeColor(cfg.brandColor, '#2563eb'); if (bg === '#FF4747') bg = '#DC2626';
        const fg = safeColor(cfg.textColor, '#ffffff');
        const storeName = escapeHTML(cfg.name || primaryOffer.store_name || 'Store');
        const affUrl = escapeHTML(primaryOffer.affiliate_url || '#');
        const pid = escapeHTML(String(product.id ?? ''));
        const symbols = { USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ' };
        const offerSym = symbols[(primaryOffer.currency || 'USD').toUpperCase()] || (primaryOffer.currency || 'USD') + ' ';
        const basePrice = parseFloat(primaryOffer.price) || 0;
        const salePrice = parseFloat(primaryOffer.sale_price) || 0;
        let priceDisplay = '';
        if (basePrice === 0 && salePrice === 0) priceDisplay = `<div style="font-weight:bold; color:#FF5A3C; margin-bottom:5px; font-size:1.05rem;">Check Price on ${storeName}</div>`;
        else if (salePrice > 0) priceDisplay = `<div style="margin-bottom:5px; display:flex; align-items:center; gap:8px;"><span style="text-decoration:line-through; color:#64748B; font-size:0.9rem;">${offerSym}${basePrice.toFixed(2)}</span><span style="font-weight:bold; color:#DC2626; font-size:1.2rem;">${offerSym}${salePrice.toFixed(2)}</span></div>`;
        else priceDisplay = `<div style="font-weight:bold; color:#1E1B4B; margin-bottom:5px;">${offerSym}${basePrice.toFixed(2)}</div>`;
        cta = `${priceDisplay}<a href="${affUrl}" target="_blank" rel="noopener sponsored" class="btn-check-price js-affiliate-link" style="background-color:${bg};color:${fg};" data-store="${storeName}" data-product-id="${pid}" data-url="${affUrl}">Check Price on ${storeName}</a>`;
    } else {
        cta = `<a href="${productUrl}" ${disabledAttr} class="btn-check-price" style="background:#64748B;">View Details</a>`;
    }
    const badge = product.badge ? `<span class="card-badge">${escapeHTML(product.badge)}</span>` : '';
    return `<div class="product-card">${badge}<div class="card-img-wrap"><a href="${productUrl}" ${disabledAttr}><img src="${imageSrc}" alt="${title}" width="200" height="200" ${loadingAttr} ${imgPriority} decoding="async" class="product-thumb" style="opacity: 0; transition: opacity 0.4s ease-in-out;" onload="handleImageLoad(this)"></a></div><div class="card-body"><a href="${productUrl}" ${disabledAttr} class="card-title">${title}</a><div class="card-rating">${escapeHTML(ratingText)}</div>${timerHtml}${cta}</div></div>`;
}

function renderFlashCard(product, section = 1) {
    const title = escapeHTML(product.title || 'Untitled');
    const productUrl = getProductUrl(product);
    const imageSrc = isValidURL(product.image_url) ? escapeHTML(getOptimizedImage(product.image_url, 200)) : 'assets/icon-192.png?v=4';
    
    const primaryOffer = getPrimaryOffer(product) || {};
    const symbols = { USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ' };
    const sym = symbols[(primaryOffer.currency || 'USD').toUpperCase()] || '$';
    const basePrice = parseFloat(primaryOffer.price) || 0;
    const salePrice = parseFloat(primaryOffer.sale_price) || 0;
    let priceDisplay = '';
    if (basePrice === 0 && salePrice === 0) priceDisplay = `<div style="font-weight:bold; color:#FF5A3C; font-size:0.95rem;">Check Price</div>`;
    else if (salePrice > 0) priceDisplay = `<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; width: 100%;"><div style="display:flex; align-items:center; gap:4px;"><span style="text-decoration:line-through; color:#64748B; font-size:0.75rem;">${sym}${basePrice.toFixed(2)}</span><span style="font-weight:bold; color:#DC2626; font-size:0.95rem;">${sym}${salePrice.toFixed(2)}</span></div></div>`;
    else priceDisplay = `<div class="price" style="font-size:0.95rem;">${sym}${basePrice.toFixed(2)}</div>`;
    
    const endTime = section === 1 ? product.sale_end_date : product.sale_end_date_2;
    const timerHtml = endTime ? `<div class="card-timer" data-endtime="${endTime}">⏳ Calculating...</div>` : '';
    
    return `<a href="${productUrl}" class="special-deal-card flash-card"><div class="img-box"><img src="${imageSrc}" alt="${title}" width="190" height="190" loading="lazy" decoding="async" style="opacity: 0; transition: opacity 0.4s ease-in-out;" onload="handleImageLoad(this)"></div><div class="info-box">${priceDisplay}<div class="title">${title}</div>${timerHtml}</div></a>`;
}

function renderProductsGrid(products, grid) {
    if (!grid) return;
    if (!products || products.length === 0) { showGridMessage(grid, 'No products found in this category.'); return; }
    let html = '';
    products.forEach((p, i) => { try { html += renderProductCard(p, i < 4); } catch (e) { console.warn("Skipping broken product:", p && p.id, e); } });
    if (html === '') { showGridMessage(grid, 'Products found, but data is corrupted.'); return; }
    grid.innerHTML = html;
    grid.querySelectorAll('img.product-thumb').forEach(img => {
        img.addEventListener('error', function() { this.src = 'assets/icon-192.png?v=4'; this.style.opacity = 1; }, { once: true });
    });
}

setInterval(() => {
    let flashSaleChanged = false;
    document.querySelectorAll('.card-timer').forEach(el => {
        if (!el.dataset.endtime || el.dataset.endtime === 'undefined' || el.dataset.endtime === 'null') return;
        const endTime = new Date(el.dataset.endtime).getTime();
        if (isNaN(endTime)) return;
        
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
            if (days > 0) el.innerHTML = `⏳ ${days}d ${hours}h ${minutes}m`;
            else el.innerHTML = `🔥 ${hours}h ${minutes}m ${seconds}s`;
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
        if (type === 'rocket') myConfetti({ particleCount: 40, spread: 70, origin: { x: Math.random() * 0.8 + 0.1, y: Math.random() * 0.5 + 0.1 }, colors: ['#fbbf24', '#ef4444', '#3b82f6', '#ffffff', '#ff8c00'], scalar: 1.2 });
        else myConfetti({ particleCount: 15, angle: 90, spread: 60, origin: { x: Math.random() * 0.8 + 0.1, y: 1 }, colors: ['#fbbf24', '#ffffff'], startVelocity: 45, gravity: 1.2, scalar: 0.8 });
    }, 800);
}
function stopFireworks() { clearInterval(fireworksInterval); }

window.scrollFlash = function(dir) { const c = document.getElementById('flashSaleScroll'); if (c) c.scrollLeft += (dir === 'left' ? -300 : 300); };
window.scrollFlash2 = function(dir) { const c = document.getElementById('flashSaleScroll2'); if (c) c.scrollLeft += (dir === 'left' ? -300 : 300); };
window.scrollSpecial = function(dir) { const c = document.getElementById('specialDealScroll'); if (c) c.scrollLeft += (dir === 'left' ? -300 : 300); };

function renderAdFallback(products) {
    const topSlot = document.getElementById('ad-fallback-top');
    const midSlot = document.getElementById('ad-fallback-middle');
    if (!products || products.length === 0) {
        if (topSlot) topSlot.innerHTML = '';
        if (midSlot) midSlot.innerHTML = '';
        return;
    }
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 12);
    const symbols = { USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ' };
    const html = selected.map(p => {
        const title = escapeHTML(p.title || 'Product');
        const productUrl = getProductUrl(p);
        const imageSrc = isValidURL(p.image_url) ? escapeHTML(getOptimizedImage(p.image_url, 200)) : 'assets/icon-192.png?v=4';
        const primaryOffer = getPrimaryOffer(p) || {};
        const sym = symbols[(primaryOffer.currency || 'USD').toUpperCase()] || '$';
        const price = parseFloat(primaryOffer.sale_price) || parseFloat(primaryOffer.price) || 0;
        return `<div class="product-card" style="cursor:pointer;" onclick="window.location.href='${productUrl}'"><div class="card-img-wrap"><img src="${imageSrc}" alt="${title}" width="200" height="200" loading="lazy" decoding="async" style="opacity: 0; transition: opacity 0.4s;" onload="handleImageLoad(this)"></div><div class="card-body"><a href="${productUrl}" class="card-title">${title}</a><div style="font-weight:bold; color:#DC2626; font-size:0.85rem; margin-bottom:4px;">${sym}${price.toFixed(2)}</div></div></div>`;
    }).join('');
    const adHtml = `<div class="ad-fallback-container">${html}</div>`;
    if (topSlot) topSlot.innerHTML = adHtml;
    if (midSlot) midSlot.innerHTML = adHtml;
}

async function loadSiteSettings() {
    if (!window.supabaseClient) return;
    try {
        const { data } = await window.supabaseClient.from('site_settings').select('*').eq('id', 1).maybeSingle();
        if (data) {
            const spTitle = document.getElementById('specialDealTitle');
            if (spTitle) {
                if (data.special_deal_title) spTitle.innerText = data.special_deal_title;
                spTitle.style.fontFamily = data.title_font_family || "'Poppins', sans-serif";
                spTitle.style.fontSize = data.title_font_size || '2rem';
                spTitle.style.fontWeight = data.title_font_weight || '800';
                spTitle.style.fontStyle = data.title_font_style || 'normal';
            }
            
            const flashTitle = document.getElementById('flashSaleTitle');
            if (flashTitle) {
                if (data.flash_title_text) flashTitle.innerText = data.flash_title_text;
                flashTitle.style.fontFamily = data.flash_title_font_family || "'Poppins', sans-serif";
                flashTitle.style.fontSize = data.flash_title_font_size || '2rem';
                flashTitle.style.fontWeight = data.flash_title_font_weight || '900';
                flashTitle.style.fontStyle = data.flash_title_font_style || 'normal';
            }

            const sale2Title = document.getElementById('flashSaleTitle2');
            if (sale2Title) {
                if (data.sale_section_2_title) sale2Title.innerText = data.sale_section_2_title;
                sale2Title.style.fontFamily = data.sale_section_2_font_family || "'Poppins', sans-serif";
                sale2Title.style.fontSize = data.sale_section_2_font_size || '2rem';
                sale2Title.style.fontWeight = data.sale_section_2_font_weight || '900';
                sale2Title.style.fontStyle = data.sale_section_2_font_style || 'normal';
            }
        }
    } catch (e) { console.error("Error loading site settings:", e); }
}

async function loadHomepageProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    try {
        const data = await API.getHomepageProducts();
        const raw = [...(data.featured ?? []), ...(data.trending ?? []), ...(data.latest ?? [])];
        const allProducts = deduplicateProducts(raw).filter(p => p.is_available !== false);
        renderProductsGrid(allProducts, grid);
        renderAdFallback(allProducts);
    } catch (err) {
        console.error('Homepage products load error:', err);
        showGridMessage(grid, 'Failed to load products.');
    }
}

async function loadSpecialDeals() {
    const section = document.getElementById('specialDealSection');
    const container = document.getElementById('specialDealScroll');
    if (!section || !container) return;
    try {
        const { data: products, error } = await window.supabaseClient
            .from('products')
            .select('id, title, slug, image_url, is_special_deal, affiliate_offers(id, store_name, affiliate_url, price, sale_price, currency)')
            .eq('is_special_deal', true).eq('is_available', true).limit(20);
        if (error || !products || products.length === 0) { section.style.display = 'none'; return; }
        section.style.display = 'flex';
        container.innerHTML = products.map(p => renderFlashCard(p, 1)).join('');
    } catch (err) { console.warn('Special deals load error:', err); section.style.display = 'none'; }
}

async function loadFlashSales() {
    const section = document.getElementById('flashSaleSection');
    const container = document.getElementById('flashSaleScroll');
    const section2 = document.getElementById('flashSaleSection2');
    const container2 = document.getElementById('flashSaleScroll2');
    const now = new Date().toISOString();
    if (section && container) {
        try {
            const { data: products } = await window.supabaseClient
                .from('products')
                .select('id, title, slug, image_url, sale_end_date, event_name, affiliate_offers(id, store_name, affiliate_url, price, sale_price, currency)')
                .gt('sale_end_date', now).eq('is_available', true).limit(20);
            if (products && products.length > 0) {
                section.style.display = 'flex';
                container.innerHTML = products.map(p => renderFlashCard(p, 1)).join('');
                if (typeof startFireworks === 'function') startFireworks();
            } else section.style.display = 'none';
        } catch (err) { console.warn('Flash sale 1 error:', err); section.style.display = 'none'; }
    }
    if (section2 && container2) {
        try {
            const { data: products2 } = await window.supabaseClient
                .from('products')
                .select('id, title, slug, image_url, sale_end_date_2, event_name_2, affiliate_offers(id, store_name, affiliate_url, price, sale_price, currency)')
                .gt('sale_end_date_2', now).eq('is_available', true).limit(20);
            if (products2 && products2.length > 0) {
                section2.style.display = 'flex';
                container2.innerHTML = products2.map(p => renderFlashCard(p, 2)).join('');
            } else section2.style.display = 'none';
        } catch (err) { console.warn('Flash sale 2 error:', err); section2.style.display = 'none'; }
    }
}

async function loadLatestBlog() {
    const section = document.getElementById('latestBlogSection');
    const link = document.getElementById('latestBlogLink');
    const img = document.getElementById('latestBlogImg');
    const title = document.getElementById('latestBlogTitle');
    const date = document.getElementById('latestBlogDate');
    if (!section || !link || !img || !title || !date) return;
    try {
        const { data: blogs } = await window.supabaseClient
            .from('blogs').select('id, title, slug, image_url, created_at')
            .eq('is_published', true).order('created_at', { ascending: false }).limit(1);
        if (!blogs || blogs.length === 0) { section.style.display = 'none'; return; }
        const blog = blogs[0];
        section.style.display = 'block';
        img.src = isValidURL(blog.image_url) ? getOptimizedImage(blog.image_url, 400) : '/assets/icon-192.png?v=4';
        img.alt = blog.title;
        title.textContent = blog.title;
        date.textContent = new Date(blog.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        link.href = `/blog/${encodeURIComponent(blog.slug)}`;
    } catch (err) { console.warn('Latest blog error:', err); section.style.display = 'none'; }
}

let allNotifications = [];
let readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
let hiddenNotifications = JSON.parse(localStorage.getItem('hidden_notifications') || '[]');

async function loadNotifications() {
    if (!window.supabaseClient) return;
    try {
        const { data } = await window.supabaseClient.from('app_notifications').select('*').order('created_at', { ascending: false }).limit(20);
        if (!data) return;
        allNotifications = data.filter(n => !hiddenNotifications.includes(n.id)); 
        updateNotifBadge();
        renderNotifPanel();
    } catch (e) { console.warn('Notif load error', e); }
}

function updateNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    const unread = allNotifications.filter(n => !readNotifications.includes(n.id)).length;
    if (unread > 0) { badge.style.display = 'flex'; badge.innerText = unread > 9 ? '9+' : unread; }
    else badge.style.display = 'none';
}

function renderNotifPanel() {
    const list = document.getElementById('notifList');
    if (!list) return;
    if (allNotifications.length === 0) {
        list.innerHTML = '<div style="padding:20px; text-align:center; color:#64748B; font-size:0.85rem;">No notifications yet</div>';
        return;
    }
    list.innerHTML = allNotifications.map(n => `
        <div class="notif-item" data-id="${n.id}">
            <div style="flex:1;">
                <h4>${escapeHTML(n.title || '')}</h4>
                <p>${escapeHTML(n.message || '')}</p>
                ${n.product_slug ? `<a href="/product/${encodeURIComponent(n.product_slug)}" style="color:#2563eb; font-size:0.75rem; text-decoration:underline;">View Product →</a>` : ''}
            </div>
            <button class="notif-del" onclick="deleteNotif(event, '${n.id}')">×</button>
        </div>
    `).join('');
}

window.toggleNotifPanel = function(e) {
    if (e) e.stopPropagation();
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    if (panel.style.display === 'block') panel.style.display = 'none';
    else {
        panel.style.display = 'block';
        allNotifications.forEach(n => { if (!readNotifications.includes(n.id)) readNotifications.push(n.id); });
        localStorage.setItem('read_notifications', JSON.stringify(readNotifications));
        updateNotifBadge();
    }
};

window.clearAllNotifs = function(e) {
    if (e) e.stopPropagation();
    allNotifications.forEach(n => {
        if (!hiddenNotifications.includes(n.id)) hiddenNotifications.push(n.id);
    });
    localStorage.setItem('hidden_notifications', JSON.stringify(hiddenNotifications));
    
    allNotifications = []; 
    readNotifications = [];
    localStorage.setItem('read_notifications', JSON.stringify([]));
    updateNotifBadge();
    renderNotifPanel();
};

window.deleteNotif = function(e, id) {
    if (e) e.stopPropagation();
    if (!hiddenNotifications.includes(id)) hiddenNotifications.push(id);
    localStorage.setItem('hidden_notifications', JSON.stringify(hiddenNotifications));
    
    allNotifications = allNotifications.filter(n => n.id !== id);
    readNotifications = readNotifications.filter(r => r !== id);
    localStorage.setItem('read_notifications', JSON.stringify(readNotifications));
    updateNotifBadge();
    renderNotifPanel();
};

document.addEventListener('click', (e) => {
    const panel = document.getElementById('notifPanel');
    if (panel && panel.style.display === 'block' && !e.target.closest('.notif-wrapper')) panel.style.display = 'none';
});

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchCategory = document.getElementById('searchCategory');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const q = searchInput?.value.trim() || '';
            const cat = searchCategory?.value || 'all';
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (cat && cat !== 'all') params.set('cat', cat);
            window.location.href = `/search.html?${params.toString()}`;
        });
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); searchBtn?.click(); }
        });
    }
}

function setupNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('newsletterEmail');
        const btn = document.getElementById('newsletterBtn');
        const msg = document.getElementById('newsletterMsg');
        const email = emailInput.value.trim();
        if (!email) return;
        btn.innerText = 'Subscribing...'; btn.disabled = true; msg.innerText = '';
        try {
            const { error } = await window.supabaseClient.from('newsletter_subscribers').insert([{ email }]);
            if (error) {
                if (error.code === '23505') { msg.style.color = '#FBBF24'; msg.innerText = 'You are already subscribed!'; }
                else throw error;
            } else {
                msg.style.color = '#4ADE80';
                msg.innerText = 'Successfully subscribed!';
                emailInput.value = '';
            }
        } catch (err) {
            console.error(err); msg.style.color = '#F87171'; msg.innerText = 'Something went wrong.';
        } finally { btn.innerText = 'Subscribe'; btn.disabled = false; }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const splash = document.getElementById('splash-screen');
    if (splash) setTimeout(() => hideSplash(), 400);
    else document.body.classList.remove('app-loading');

    await Promise.allSettled([
        renderDynamicCategories(),
        loadHomepageProducts(),
        loadSpecialDeals(),
        loadFlashSales(),
        loadLatestBlog(),
        loadNotifications(),
        loadSiteSettings()
    ]);

    setupSearch();
    setupNewsletter();

    const savedScroll = sessionStorage.getItem('homeScrollY');
    if (savedScroll) {
        setTimeout(() => { window.scrollTo(0, parseInt(savedScroll, 10)); sessionStorage.removeItem('homeScrollY'); }, 100);
    }

    if (window.supabaseClient) {
        window.supabaseClient.channel('public:app_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_notifications' }, () => loadNotifications())
            .subscribe();
    }
});

window.loadHomepageProducts = loadHomepageProducts;
