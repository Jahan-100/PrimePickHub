/**
 * PrimePickHub Homepage Renderer
 */

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function isValidExternalURL(url) {
    if (typeof url !== 'string') return false;
    try {
        const p = new URL(url);
        return p.protocol === 'https:' || p.protocol === 'http:';
    } catch { return false; }
}

function isValidURL(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const p = new URL(url, window.location.origin);
        return p.protocol === 'http:' || p.protocol === 'https:';
    } catch { return false; }
}

function safeColor(v, fb) {
    return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fb;
}

function getPrimaryOffer(product) {
    if (!product || !Array.isArray(product.affiliate_offers)) return null;
    return product.affiliate_offers.find(
        o => o && typeof o.store_name === 'string' && isValidExternalURL(o.affiliate_url)
    ) || null;
}

function deduplicateProducts(list) {
    if (!Array.isArray(list)) return [];
    const map = new Map();
    list.forEach(p => {
        if (!p) return;
        const k = p.id != null ? `id:${p.id}` : (p.slug ? `slug:${p.slug}` : null);
        if (k && !map.has(k)) map.set(k, p);
    });
    return Array.from(map.values());
}

function showGridMessage(grid, msg) {
    if (!grid) return;
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;"><p>${escapeHTML(msg)}</p></div>`;
}

function renderProductCard(product) {
    if (!product || typeof product !== 'object') return '';

    const title = escapeHTML(product.title || 'Untitled');
    let id = '';
    // ⭐ Clean URL logic for Netlify
    if (product.slug) id = `${encodeURIComponent(product.slug)}`;
    else if (product.id != null) id = `id-${encodeURIComponent(product.id)}`;
    
    const hasLink = Boolean(id);
    const productUrl = hasLink ? `/product/${id}` : '#';
    const disabledAttr = hasLink ? '' : 'aria-disabled="true" tabindex="-1" style="pointer-events:none;opacity:0.6;"';

    const imageSrc = isValidURL(product.image_url)
        ? escapeHTML(product.image_url) : 'assets/icon-192.png'; // ⭐ Fallback fixed

    const r = Number(product.rating);
    const rating = Number.isFinite(r) && r > 0 && r <= 5 ? r : null;
    const rc = Number(product.reviews_count);
    const reviewCount = Number.isInteger(rc) && rc >= 0 ? rc : 0;
    const ratingText = rating !== null ? `★ ${rating.toFixed(1)} (${reviewCount})` : 'Not yet rated';

    const primaryOffer = getPrimaryOffer(product);
    const networks = (typeof CONFIG !== 'undefined' && CONFIG.networks) ? CONFIG.networks : {};
    let cta = '';

    if (primaryOffer) {
        const storeKey = primaryOffer.store_name.toLowerCase();
        const cfg = networks[storeKey] ?? networks[primaryOffer.store_name] ?? {
            name: primaryOffer.store_name, brandColor: '#2563eb', textColor: '#ffffff'
        };
        const bg = safeColor(cfg.brandColor, '#2563eb');
        const fg = safeColor(cfg.textColor, '#ffffff');
        const storeName = escapeHTML(cfg.name || primaryOffer.store_name);
        const affUrl = escapeHTML(primaryOffer.affiliate_url);
        const pid = escapeHTML(String(product.id ?? ''));

        // ⭐ DYNAMIC CURRENCY ADDED HERE ⭐
        const currencySymbols = { USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ' };
        const offerCurrency = (primaryOffer.currency || 'USD').toUpperCase();
        const offerSymbol = currencySymbols[offerCurrency] || offerCurrency + ' ';
        const priceDisplay = primaryOffer.price ? `<div style="font-weight:bold; color:#1E1B4B; margin-bottom:5px;">${offerSymbol}${primaryOffer.price}</div>` : '';

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
                ${cta}
            </div>
        </div>`;
}

function renderProductsGrid(products, grid) {
    if (!grid) return;
    if (!products || products.length === 0) {
        showGridMessage(grid, 'No products found. Please check back later!');
        return;
    }
    grid.innerHTML = products.map(renderProductCard).join('');
    grid.querySelectorAll('img.product-thumb').forEach(img => {
        img.addEventListener('error', function () {
            this.src = 'assets/icon-192.png'; // ⭐ Fallback fixed
        }, { once: true });
    });
}

async function loadHomepageProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    showGridMessage(grid, 'Loading products...');

    try {
        if (typeof API === 'undefined' || !API.getHomepageProducts) throw new Error('API missing');
        const data = await API.getHomepageProducts();
        const raw = [...(data.featured ?? []), ...(data.trending ?? []), ...(data.latest ?? [])];
        renderProductsGrid(deduplicateProducts(raw), grid);
    } catch (err) {
        console.error('Load failed:', err);
        showGridMessage(grid, 'Products could not be loaded. Please refresh.');
    }
}

function handleSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    const q = input.value.trim();
    if (q) window.location.href = `search.html?q=${encodeURIComponent(q)}`;
}

document.addEventListener('DOMContentLoaded', () => {
    loadHomepageProducts();
    const btn = document.getElementById('searchBtn');
    const input = document.getElementById('searchInput');
    if (btn) btn.addEventListener('click', handleSearch);
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') handleSearch(); });
});
