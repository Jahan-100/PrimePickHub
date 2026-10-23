function escapeHTML(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    
    let categorySlug = params.get('cat') || params.get('category');

    // ⭐ Clean URL se category nikalne ka logic
    if (!categorySlug && path.startsWith('/category/')) {
        categorySlug = path.replace('/category/', '').split('/')[0];
    }

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
        const offer = (p.affiliate_offers && p.affiliate_offers[0]) || null;
        const storeName = offer ? offer.store_name : 'Amazon';
        const cfg = CONFIG.networks[storeName.toLowerCase()] || CONFIG.networks.amazon;
        const bg = /^#[0-9a-fA-F]{6}$/.test(cfg.brandColor) ? cfg.brandColor : '#2563eb';
        const fg = /^#[0-9a-fA-F]{6}$/.test(cfg.textColor) ? cfg.textColor : '#ffffff';
        const affUrl = offer ? offer.affiliate_url : '#';

        const pUrl = p.slug ? `/product/${encodeURIComponent(p.slug)}` : '#';
        const imgSrc = p.image_url ? escapeHTML(p.image_url) : '/assets/icon-192.png';

        return `
            <div class="product-card">
                <div class="card-img-wrap">
                    ${p.badge ? `<span class="card-badge">${escapeHTML(p.badge)}</span>` : ''}
                    <img src="${imgSrc}" alt="${escapeHTML(p.title)}" loading="lazy">
                </div>
                <div class="card-body">
                    <a href="${pUrl}" class="card-title">${escapeHTML(p.title)}</a>
                    <div class="card-rating">★ ${p.rating || '—'} (${p.reviews_count || 0})</div>
                    <a href="${escapeHTML(affUrl)}" target="_blank" rel="noopener noreferrer sponsored"
                       class="btn-check-price js-affiliate-link"
                       style="background-color:${bg};color:${fg};"
                       data-store="${escapeHTML(storeName)}"
                       data-product-id="${escapeHTML(String(p.id))}"
                       data-url="${escapeHTML(affUrl)}">
                       Check Price on ${escapeHTML(storeName)}
                    </a>
                </div>
            </div>`;
    }).join('');
});

function handleCategorySearch() {
    const q = document.getElementById('searchInput')?.value.trim();
    if (q) window.location.href = `/search.html?q=${encodeURIComponent(q)}`;
}
