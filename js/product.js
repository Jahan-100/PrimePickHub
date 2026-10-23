/**
 * Product Detail Page with Real-Time Currency Conversion
 */
function escapeHTML(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Currency Symbols
const currencySymbols = {
    USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ', CAD: 'C$', AUD: 'A$'
};

function getVideoHtml(url) {
    if (!url || typeof url !== 'string') return '';
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) {
        return `<video controls style="width:100%;border-radius:12px;background:#000;"><source src="${escapeHTML(url)}"></video>`;
    }
    let embedUrl = url;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch && !url.includes('/video/')) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;

    return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;"><iframe src="${escapeHTML(embedUrl)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div>`;
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    const id = params.get('id');
    const container = document.getElementById('productContainer');

    if (!slug && !id) { window.location.href = 'index.html'; return; }

    const product = slug
        ? await API.getProductBySlug(slug)
        : await (async () => {
            if (!window.supabaseClient) return null;
            const { data } = await window.supabaseClient.from('products').select('*, affiliate_offers(*)').eq('id', id).single();
            return data;
        })();

    if (!product) {
        container.innerHTML = '<h2 style="text-align:center;padding:40px;">Product not found. <a href="index.html">Return Home</a></h2>';
        return;
    }

    document.title = `${product.title} - Best Price | PrimePickHub`;
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', product.title);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', product.image_url || '');
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', product.description || '');

    const offers = (product.affiliate_offers && product.affiliate_offers.length > 0) ? product.affiliate_offers : [];
    const primaryOffer = offers[0] || { price: '0', store_name: 'Store', currency: 'USD' };

    // Currency Setup
    const baseCurrency = (primaryOffer.currency || 'USD').toUpperCase();
    const basePrice = parseFloat(primaryOffer.price) || 0;
    const baseSymbol = currencySymbols[baseCurrency] || baseCurrency + ' ';

    const offersHtml = offers.length > 0
        ? offers.map(o => {
            const cfg = CONFIG.networks[o.store_name.toLowerCase()] || CONFIG.networks.amazon;
            const bg = /^#[0-9a-fA-F]{6}$/.test(cfg.brandColor) ? cfg.brandColor : '#2563eb';
            const fg = /^#[0-9a-fA-F]{6}$/.test(cfg.textColor) ? cfg.textColor : '#ffffff';
            return `<a href="${escapeHTML(o.affiliate_url)}" target="_blank" rel="noopener noreferrer sponsored"
                       class="btn-check-price js-affiliate-link"
                       style="background-color:${bg};color:${fg};padding:14px;margin-bottom:10px;display:block;text-align:center;"
                       data-store="${escapeHTML(o.store_name)}" data-product-id="${escapeHTML(String(product.id))}" data-url="${escapeHTML(o.affiliate_url)}">
                       Buy on ${escapeHTML(o.store_name)}
                    </a>`;
        }).join('')
        : '<p style="color:#64748B;">No offers available yet.</p>';

    let galleryImages = (product.gallery_images && product.gallery_images.length > 0) ? product.gallery_images.filter(Boolean) : [];
    if (galleryImages.length === 0 && product.image_url) galleryImages = [product.image_url];
    const mainImage = galleryImages[0] || 'assets/icon-192.png';

    const thumbnailsHtml = galleryImages.length > 1
        ? galleryImages.map((url, i) => `
            <img src="${escapeHTML(url)}" alt="View ${i + 1}" class="gallery-thumb" data-src="${escapeHTML(url)}"
                 style="width:70px;height:70px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid ${i === 0 ? '#FF5A3C' : '#E2E8F0'};transition:border-color 0.2s;">`).join('')
        : '';

    const videoHtml = product.video_url ? `<div style="background:#fff; padding:30px; border-radius:12px; border:1px solid #E2E8F0; margin-bottom:20px;"><h2 style="margin-bottom:15px; border-bottom:2px solid #FF5A3C; padding-bottom:10px; display:inline-block;">Product Video</h2>${getVideoHtml(product.video_url)}</div>` : '';

    const shareUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent(`Check out ${product.title} on PrimePickHub`);

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:40px;background:#fff;padding:30px;border-radius:12px;border:1px solid #E2E8F0;margin-bottom:20px;">
            <div>
                <div style="background:#F8FAFC;border-radius:12px;padding:15px;margin-bottom:15px;">
                    <img id="mainImage" src="${escapeHTML(mainImage)}" alt="${escapeHTML(product.title)}" style="width:100%;max-height:400px;object-fit:contain;border-radius:8px;" onerror="this.src='assets/icon-192.png';">
                </div>
                ${thumbnailsHtml ? `<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">${thumbnailsHtml}</div>` : ''}
            </div>
            <div>
                <h1 style="font-size:1.8rem;margin-bottom:10px;">${escapeHTML(product.title)}</h1>
                
                <!-- ⭐ CURRENCY CONVERTER UI ⭐ -->
                <div style="margin-bottom: 20px; background: #F8FAFC; padding: 15px; border-radius: 8px; border: 1px solid #E2E8F0;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <span style="font-size: 1.4rem; font-weight: bold; color: #FF5A3C;" id="displayPrice">${baseSymbol}${basePrice.toFixed(2)}</span>
                        <select id="currencySelector" style="padding: 5px 10px; border-radius: 6px; border: 1px solid #CBD5E1; font-weight: bold; color: #1E1B4B; background: #fff; cursor: pointer;">
                            <option value="${baseCurrency}">${baseCurrency}</option>
                            <option value="USD">USD ($)</option>
                            <option value="PKR">PKR (Rs)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="INR">INR (₹)</option>
                            <option value="AED">AED (د.إ)</option>
                            <option value="CAD">CAD (C$)</option>
                            <option value="AUD">AUD (A$)</option>
                        </select>
                    </div>
                    <p style="font-size: 0.75rem; color: #64748B; margin: 0;"><i>Real-time rates powered by Frankfurter API</i></p>
                </div>

                <p style="color:#64748B;margin-bottom:20px;">${escapeHTML(product.description || '')}</p>
                <div style="margin-bottom:25px;padding:15px;background:#F8FAFC;border-radius:8px;">
                    <p style="font-size:0.85rem;color:#64748B;margin-bottom:10px;">You will be redirected to the official store to confirm live price.</p>
                    ${offersHtml}
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <a href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank" rel="noopener" style="padding:8px 16px;background:#25D366;color:#fff;border-radius:6px;text-decoration:none;font-size:0.9rem;">Share on WhatsApp</a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener" style="padding:8px 16px;background:#1877F2;color:#fff;border-radius:6px;text-decoration:none;font-size:0.9rem;">Share on Facebook</a>
                </div>
            </div>
        </div>
        ${videoHtml}
        <div style="background:#fff;padding:30px;border-radius:12px;border:1px solid #E2E8F0;">
            <h2 style="margin-bottom:20px;border-bottom:2px solid #FF5A3C;padding-bottom:10px;display:inline-block;">Our Detailed Review</h2>
            <div style="color:#334155;line-height:1.8;font-size:1.05rem;">${product.review_html || '<p>Detailed review coming soon...</p>'}</div>
        </div>
    `;

    // ⭐ CURRENCY CONVERTER LOGIC ⭐
    const currencySelector = document.getElementById('currencySelector');
    const displayPrice = document.getElementById('displayPrice');
    let exchangeRates = {};

    // Fetch rates from Frankfurter API
    async function fetchRates() {
        try {
            const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${baseCurrency}`);
            const data = await res.json();
            exchangeRates = data.rates;
            exchangeRates[baseCurrency] = 1; // Base currency rate is always 1
        } catch (err) {
            console.warn('Could not fetch live rates. Using fallback.');
            // Fallback approximate rates agar internet issue ho
            exchangeRates = { USD: 1, PKR: 278.5, EUR: 0.92, GBP: 0.79, INR: 83.2, AED: 3.67, CAD: 1.36, AUD: 1.52 };
        }
    }

    // Convert and update UI
    function updatePrice(currency) {
        const rate = exchangeRates[currency];
        if (!rate) return;
        const converted = basePrice * rate;
        const symbol = currencySymbols[currency] || currency + ' ';
        displayPrice.innerText = `${symbol}${converted.toFixed(2)}`;
    }

    // Initialize
    await fetchRates();

    // On change currency
    currencySelector.addEventListener('change', (e) => {
        updatePrice(e.target.value);
    });

    // Attach thumbnail click handlers
    container.querySelectorAll('.gallery-thumb').forEach(thumb => {
        thumb.addEventListener('click', function () {
            document.getElementById('mainImage').src = this.dataset.src;
            container.querySelectorAll('.gallery-thumb').forEach(t => t.style.borderColor = '#E2E8F0');
            this.style.borderColor = '#FF5A3C';
        });
    });

    // JSON-LD Schema
    const jsonLd = {
        "@context": "https://schema.org/", "@type": "Product", "name": product.title,
        "image": [product.image_url].concat(product.gallery_images || []).filter(Boolean),
        "description": product.description || product.title,
        "offers": offers.map(o => ({
            "@type": "Offer", "url": o.affiliate_url, "priceCurrency": o.currency || "USD",
            "price": o.price, "availability": "https://schema.org/InStock", "seller": { "@type": "Organization", "name": o.store_name }
        }))
    };
    if (product.rating && product.reviews_count > 0) jsonLd.aggregateRating = { "@type": "AggregateRating", "ratingValue": product.rating, "reviewCount": product.reviews_count };
    const script = document.createElement('script'); script.type = 'application/ld+json'; script.text = JSON.stringify(jsonLd); document.head.appendChild(script);
});
