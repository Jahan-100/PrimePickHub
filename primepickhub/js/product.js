/**
 * Product Detail Page - SEO Optimized
 */
function escapeHTML(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    const id = params.get('id');
    const container = document.getElementById('productContainer');

    if (!slug && !id) {
        window.location.href = 'index.html';
        return;
    }

    const product = slug
        ? await API.getProductBySlug(slug)
        : await (async () => {
            if (!window.supabaseClient) return null;
            const { data } = await window.supabaseClient.from('products')
                .select('*, affiliate_offers(*)').eq('id', id).single();
            return data;
        })();

    if (!product) {
        container.innerHTML = '<h2 style="text-align:center;padding:40px;">Product not found. <a href="index.html">Return Home</a></h2>';
        return;
    }

    document.title = `${product.title} - Best Price | PrimePickHub`;

    // Update Meta Tags for SEO
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', product.title);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', product.image_url || '');
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', product.description || '');

    const offers = (product.affiliate_offers && product.affiliate_offers.length > 0) ? product.affiliate_offers : [];
    
    // Primary offer for price display
    const primaryOffer = offers[0] || { price: 'N/A', store_name: 'Store' };

    const offersHtml = offers.length > 0
        ? offers.map(o => {
            const cfg = CONFIG.networks[o.store_name.toLowerCase()] || CONFIG.networks.amazon;
            const bg = /^#[0-9a-fA-F]{6}$/.test(cfg.brandColor) ? cfg.brandColor : '#2563eb';
            const fg = /^#[0-9a-fA-F]{6}$/.test(cfg.textColor) ? cfg.textColor : '#ffffff';
            return `<a href="${escapeHTML(o.affiliate_url)}" target="_blank" rel="noopener noreferrer sponsored"
                       class="btn-check-price js-affiliate-link"
                       style="background-color:${bg};color:${fg};padding:14px;margin-bottom:10px;display:block;text-align:center;"
                       data-store="${escapeHTML(o.store_name)}"
                       data-product-id="${escapeHTML(String(product.id))}"
                       data-url="${escapeHTML(o.affiliate_url)}">
                       Buy on ${escapeHTML(o.store_name)} (Rs. ${o.price})
                    </a>`;
        }).join('')
        : '<p style="color:#64748B;">No offers available yet.</p>';

    const shareUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent(`Check out ${product.title} on PrimePickHub`);

    // HTML Render
    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:40px;background:#fff;padding:30px;border-radius:12px;border:1px solid #E2E8F0; margin-bottom:20px;">
            <div>
                <img src="${escapeHTML(product.image_url || 'assets/icon-192.png')}"
                     alt="${escapeHTML(product.title)}"
                     style="width:100%;border-radius:12px;max-height:400px;object-fit:contain;">
            </div>
            <div>
                <h1 style="font-size:1.8rem;margin-bottom:10px;">${escapeHTML(product.title)}</h1>
                <p style="font-size:1.2rem; font-weight:bold; color:#FF5A3C; margin-bottom:15px;">Rs. ${primaryOffer.price}</p>
                <p style="color:#64748B;margin-bottom:20px;">${escapeHTML(product.description || '')}</p>
                <div style="margin-bottom:25px;padding:15px;background:#F8FAFC;border-radius:8px;">
                    <p style="font-size:0.85rem;color:#64748B;margin-bottom:10px;">You will be redirected to the official store to confirm live price, stock, and delivery.</p>
                    ${offersHtml}
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <a href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank" rel="noopener" style="padding:8px 16px;background:#25D366;color:#fff;border-radius:6px;text-decoration:none;font-size:0.9rem;">Share on WhatsApp</a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener" style="padding:8px 16px;background:#1877F2;color:#fff;border-radius:6px;text-decoration:none;font-size:0.9rem;">Share on Facebook</a>
                </div>
            </div>
        </div>

        <!-- ⭐ SEO REVIEW CONTENT SECTION -->
        <div style="background:#fff; padding:30px; border-radius:12px; border:1px solid #E2E8F0;">
            <h2 style="margin-bottom:20px; border-bottom:2px solid #FF5A3C; padding-bottom:10px; display:inline-block;">Our Detailed Review</h2>
            <div style="color:#334155; line-height:1.8; font-size:1.05rem;">
                ${product.review_html ? product.review_html : '<p>Detailed review coming soon...</p>'}
            </div>
        </div>
    `;

    // ⭐ Fixed JSON-LD Schema for Google Rich Results
    const jsonLd = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.title,
        "image": [product.image_url].filter(Boolean),
        "description": product.description || product.title,
        "offers": offers.map(o => ({
            "@type": "Offer",
            "url": o.affiliate_url,
            "priceCurrency": o.currency || "PKR",
            "price": o.price, // Price is mandatory now
            "availability": "https://schema.org/InStock",
            "seller": { "@type": "Organization", "name": o.store_name }
        }))
    };
    
    if (product.rating && product.reviews_count > 0) {
        jsonLd.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": product.rating,
            "reviewCount": product.reviews_count
        };
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);
});