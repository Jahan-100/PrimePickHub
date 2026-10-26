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
        const primaryOffer = (p.affiliate_offers && p.affiliate_offers[0]) || {};
        const storeName = primaryOffer.store_name || 'Amazon';
        
        // Network Config
        const cfg = CONFIG.networks[storeName.toLowerCase()] || CONFIG.networks.amazon;
        const bg = /^#[0-9a-fA-F]{6}$/.test(cfg.brandColor) ? cfg.brandColor : '#2563eb';
        const fg = /^#[0-9a-fA-F]{6}$/.test(cfg.textColor) ? cfg.textColor : '#ffffff';
        const affUrl = primaryOffer.affiliate_url || '#';

        // ⭐ Price Calculation (Same as app.js)
        const currencySymbols = { USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ' };
        const offerSymbol = currencySymbols[(primaryOffer.currency || 'USD').toUpperCase()] || '$';
        
        const basePrice = parseFloat(primaryOffer.price) || 0;
        const salePrice = parseFloat(primaryOffer.sale_price) || 0;
        const commissionRate = parseFloat(primaryOffer.commission_rate) || 0;
        
        const now = new Date();
        const isSaleActive = p.sale_end_date && new Date(p.sale_end_date) > now;

        let finalPrice = basePrice;
        let priceDisplay = '';

        if (isSaleActive && salePrice > 0) {
            const finalSale = commissionRate > 0 ? salePrice + (salePrice * (commissionRate / 100)) : salePrice;
            const finalOrig = commissionRate > 0 ? basePrice + (basePrice * (commissionRate / 100)) : basePrice;
            
            priceDisplay = `
                <div style="margin: 5px 0 10px 0; display:flex; align-items:center; gap:8px;">
                    <span style="text-decoration:line-through; color:#94A3B8; font-size:0.9rem;">${offerSymbol}${finalOrig.toFixed(2)}</span>
                    <span style="font-weight:bold; color:#FF5A3C; font-size:1.1rem;">${offerSymbol}${finalSale.toFixed(2)}</span>
                </div>`;
        } else {
            finalPrice = commissionRate > 0 ? basePrice + (basePrice * (commissionRate / 100)) : basePrice;
            priceDisplay = `<div style="font-weight:bold; color:#1E1B4B; margin: 5px 0 10px 0; font-size:1.1rem;">${offerSymbol}${finalPrice.toFixed(2)}</div>`;
        }

        const pUrl = p.slug ? `/product/${encodeURIComponent(p.slug)}` : '#';
        const imgSrc = p.image_url ? escapeHTML(p.image_url) : 'assets/icon-192.png';

        return `
            <div class="product-card">
                <div class="card-img-wrap">
                    <img src="${imgSrc}" alt="${escapeHTML(p.title)}" loading="lazy">
                </div>
                <div class="card-body">
                    <a href="${pUrl}" class="card-title">${escapeHTML(p.title)}</a>
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
