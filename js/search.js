function escapeHTML(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';
    const grid = document.getElementById('searchGrid');
    const title = document.getElementById('searchTitle');

    if (title) title.innerText = query ? `Results for "${query}"` : 'All Products';

    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;">Searching...</p>';

    const results = await API.searchProducts({ query });

    if (!results || results.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;">No products found.</p>';
        return;
    }

    grid.innerHTML = results.map(p => {
        const offer = (p.affiliate_offers && p.affiliate_offers[0]) || null;
        const storeName = offer ? offer.store_name : 'Amazon';
        const cfg = CONFIG.networks[storeName.toLowerCase()] || CONFIG.networks.amazon;
        const bg = /^#[0-9a-fA-F]{6}$/.test(cfg.brandColor) ? cfg.brandColor : '#2563eb';
        const fg = /^#[0-9a-fA-F]{6}$/.test(cfg.textColor) ? cfg.textColor : '#ffffff';
        const affUrl = offer ? offer.affiliate_url : '#';

        // ⭐ Clean URL logic
        const pUrl = p.slug ? `/product/${encodeURIComponent(p.slug)}` : '#';
        const imgSrc = p.image_url ? escapeHTML(p.image_url) : 'assets/icon-192.png';

        return `
            <div class="product-card">
                <div class="card-img-wrap">
                    <img src="${imgSrc}" alt="${escapeHTML(p.title)}" loading="lazy">
                </div>
                <div class="card-body">
                    <a href="${pUrl}" class="card-title">${escapeHTML(p.title)}</a>
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