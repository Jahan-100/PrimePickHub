function escapeHTML(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const categorySlug = params.get('cat') || params.get('category');
    const grid = document.getElementById('categoryGrid');
    const titleEl = document.getElementById('categoryTitle');
    const bcEl = document.getElementById('breadcrumbCategory');

    if (!categorySlug) { window.location.href = '/index.html'; return; }

    const title = categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    document.title = `${title} Deals - PrimePickHub`;
    if (titleEl) titleEl.innerText = `${title} Products`;
    if (bcEl) bcEl.innerText = title;

    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;">Loading...</p>';

    const products = await API.searchProducts({ category: categorySlug });

    if (!products || products.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
            <h3>No products in "${escapeHTML(title)}" yet</h3>
            <p style="color:#64748B;margin-top:10px;">Check back later or <a href="/index.html">browse all products</a>.</p>
        </div>`;
        return;
    }

    grid.innerHTML = products.map(p => {
        const primaryOffer = (p.affiliate_offers && p.affiliate_offers[0]) || {};
        const storeName = primaryOffer.store_name || 'Amazon';
        
        const cfg = CONFIG.networks[storeName.toLowerCase()] || CONFIG.networks.amazon;
        const bg = /^#[0-9a-fA-F]{6}$/.test(cfg.brandColor) ? cfg.brandColor : '#2563eb';
        const fg = /^#[0-9a-fA-F]{6}$/.test(cfg.textColor) ? cfg.textColor : '#ffffff';
        const affUrl = primaryOffer.affiliate_url || '#';

        const currencySymbols = { USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ' };
        const offerSymbol = currencySymbols[(primaryOffer.currency || 'USD').toUpperCase()] || '$';
        
        // ⭐ FIX: Check salePrice > 0 instead of date
        const basePrice = parseFloat(primaryOffer.price) || 0;
        const salePrice = parseFloat(primaryOffer.sale_price) || 0;
        
        let priceDisplay = '';

        if (salePrice > 0) {
            priceDisplay = `
                <div style="margin: 5px 0 10px 0; display:flex; align-items:center; gap:8px;">
                    <span style="text-decoration:line-through; color:#94A3B8; font-size:0.9rem;">${offerSymbol}${basePrice.toFixed(2)}</span>
                    <span style="font-weight:bold; color:#FF5A3C; font-size:1.1rem;">${offerSymbol}${salePrice.toFixed(2)}</span>
                </div>`;
        } else {
            priceDisplay = `<div style="font-weight:bold; color:#1E1B4B; margin: 5px 0 10px 0; font-size:1.1rem;">${offerSymbol}${basePrice.toFixed(2)}</div>`;
        }

        const pUrl = p.slug ? `/product/${encodeURIComponent(p.slug)}` : '#';
        const imgSrc = p.image_url ? escapeHTML(p.image_url) : 'assets/icon-192.png';

        return `
            <div class="product-card">
                <div class="card-img-wrap">
                    ${p.badge ? `<span class="card-badge">${escapeHTML(p.badge)}</span>` : ''}
                    <img src="${imgSrc}" alt="${escapeHTML(p.title)}" loading="lazy">
                </div>
                <div class="card-body">
                    <a href="${pUrl}" class="card-title">${escapeHTML(p.title)}</a>
                    <div class="card-rating">★ ${p.rating || '—'} (${p.reviews_count || 0})</div>
                    ${priceDisplay}
                    <a href="${escapeHTML(affUrl)}" target="_blank" rel="noopener noreferrer sponsored"
                       class="btn-check-price js-affiliate-link"
                       style="background-color:${bg};color:${fg};"
                       data-store="${escapeHTML(storeName)}"
                       data-product-id="${escapeHTML(String(p.id))}"
                       data-url="${escapeHTML(affUrl)}">
                       Check Price
                    </a>
                </div>
            </div>`;
    }).join('');
});

function handleCategorySearch() {
    const q = document.getElementById('searchInput')?.value.trim();
    if (q) window.location.href = `/search.html?q=${encodeURIComponent(q)}`;
}
