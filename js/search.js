function escapeHTML(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';
    const category = params.get('cat') || '';
    const isSpecial = params.get('special') === 'true';
    const isFlash = params.get('flash') === 'true';
    const flashEvent = params.get('event'); // ⭐ Flash Event Name
    const grid = document.getElementById('searchGrid');
    const title = document.getElementById('searchTitle');

    if (title) {
        if (isSpecial) {
            title.innerText = 'Special Deals';
        } else if (isFlash) {
            title.innerText = flashEvent ? `${flashEvent} Deals` : 'Flash Sale Deals';
        } else {
            let titleText = query ? `Results for "${query}"` : 'All Products';
            if (category) titleText += ` in ${category}`;
            title.innerText = titleText;
        }
    }

    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;">Searching...</p>';

    let results = [];
    try {
        if (isSpecial) {
            const { data, error } = await window.supabaseClient
                .from('products')
                .select('*, affiliate_offers(*)')
                .eq('is_special_deal', true)
                .eq('is_available', true);
            if (!error) results = data || [];
        } else if (isFlash) {
            const now = new Date().toISOString();
            let req = window.supabaseClient
                .from('products')
                .select('*, affiliate_offers(*)')
                .gt('sale_end_date', now) 
                .eq('is_available', true);
            
            // ⭐ Agar specific event ka naam URL mein hai toh sirf usi ki products layein
            if (flashEvent) {
                req = req.eq('event_name', flashEvent);
            }
            
            const { data, error } = await req;
            if (!error) results = data || [];
        } else {
            results = await API.searchProducts({ query, category });
        }
    } catch (err) {
        console.error(err);
    }

    if (!results || results.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;"><p>No products found.</p></div>`;
        return;
    }

    grid.innerHTML = results.map(p => {
        const offers = p.affiliate_offers || [];
        const primaryOffer = offers[0] || {};
        
        const storeName = primaryOffer.store_name || 'Amazon';
        
        const cfg = CONFIG.networks[storeName.toLowerCase()] || CONFIG.networks.amazon;
        const bg = /^#[0-9a-fA-F]{6}$/.test(cfg.brandColor) ? cfg.brandColor : '#2563eb';
        const fg = /^#[0-9a-fA-F]{6}$/.test(cfg.textColor) ? cfg.textColor : '#ffffff';
        const affUrl = primaryOffer.affiliate_url || '#';

        const currencySymbols = { USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ' };
        const offerSymbol = currencySymbols[(primaryOffer.currency || 'USD').toUpperCase()] || '$';
        
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
                <div style="margin: 5px 0 10px 0; display:flex; align-items:center; gap:8px;">
                    <span style="text-decoration:line-through; color:#94A3B8; font-size:0.9rem;">${offerSymbol}${finalBasePrice.toFixed(2)}</span>
                    <span style="font-weight:bold; color:#FF5A3C; font-size:1.1rem;">${offerSymbol}${finalSalePrice.toFixed(2)}</span>
                </div>`;
        } else {
            priceDisplay = `<div style="font-weight:bold; color:#1E1B4B; margin: 5px 0 10px 0; font-size:1.1rem;">${offerSymbol}${finalBasePrice.toFixed(2)}</div>`;
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
