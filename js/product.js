/**
 * Product Detail Page with Real-Time Currency Conversion
 */
function escapeHTML(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

const currencySymbols = {
    USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ', 
    SAR: 'SAR ', CAD: 'C$', AUD: 'A$', CNY: '¥', JPY: '¥', TRY: '₺', 
    BDT: '৳', MYR: 'RM ', IDR: 'Rp ', QAR: 'QAR ', KWD: 'KWD ', 
    BHD: 'BHD ', OMR: 'OMR ', ZAR: 'R ', BRL: 'R$', MXN: 'MX$', 
    RUB: '₽', KRW: '₩', SGD: 'S$', HKD: 'HK$', NZD: 'NZ$', 
    CHF: 'CHF ', SEK: 'kr ', NOK: 'kr '
};

function getVideoHtml(url) {
    if (!url || typeof url !== 'string') return '';
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return `<video controls style="width:100%;border-radius:12px;background:#000;"><source src="${escapeHTML(url)}"></video>`;
    let embedUrl = url;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch && !url.includes('/video/')) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;"><iframe src="${escapeHTML(embedUrl)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div>`;
}

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    let slug = params.get('slug'); let id = params.get('id');
    if (!slug && path.startsWith('/product/')) slug = path.replace('/product/', '').split('/')[0];

    const container = document.getElementById('productContainer');
    if (!slug && !id) { window.location.href = '/index.html'; return; }

    const product = slug ? await API.getProductBySlug(slug) : await (async () => {
        if (!window.supabaseClient) return null;
        const { data } = await window.supabaseClient.from('products').select('*, affiliate_offers(*)').eq('id', id).single();
        return data;
    })();

    if (!product) { container.innerHTML = '<h2 style="text-align:center;padding:40px;">Product not found. <a href="/index.html">Return Home</a></h2>'; return; }

    document.title = `${product.title} - Best Price | PrimePickHub`;
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', product.title);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', product.image_url || '');
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', product.description || '');

    const allOffers = product.affiliate_offers || [];
    const defaultOffer = allOffers[0] || { price: '0', store_name: 'Store', currency: 'USD', commission_rate: 0, sale_price: null };
    const variations = allOffers.slice(1); // First offer is main offer, rest are variations

    const baseCurrency = (defaultOffer.currency || 'USD').toUpperCase();
    let activeOffer = defaultOffer;

    const renderBuyButton = (offer) => {
        const cfg = CONFIG.networks[offer.store_name?.toLowerCase()] || CONFIG.networks.amazon;
        const bg = /^#[0-9a-fA-F]{6}$/.test(cfg.brandColor) ? cfg.brandColor : '#2563eb';
        const fg = /^#[0-9a-fA-F]{6}$/.test(cfg.textColor) ? cfg.textColor : '#ffffff';
        return `<a href="${escapeHTML(offer.affiliate_url || '#')}" target="_blank" rel="noopener noreferrer sponsored"
                   class="btn-check-price js-affiliate-link"
                   style="background-color:${bg};color:${fg};padding:14px;display:block;text-align:center;"
                   data-store="${escapeHTML(offer.store_name)}" data-product-id="${escapeHTML(String(product.id))}" data-url="${escapeHTML(offer.affiliate_url)}">
                   Buy on ${escapeHTML(offer.store_name || 'Store')}
                </a>`;
    };

    let variationHtml = '';
    if (variations.length > 0) {
        variationHtml = `
            <div style="margin-bottom: 15px;">
                <p style="font-weight:bold; margin-bottom:8px;">Select Option:</p>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    ${variations.map((v, i) => `
                        <button class="var-btn" data-index="${i}" style="padding:8px 16px; border:2px solid #E2E8F0; background:#fff; border-radius:6px; cursor:pointer; font-weight:bold; color:#1E1B4B; transition:all 0.2s;">
                            ${escapeHTML(v.variation_name)}
                        </button>
                    `).join('')}
                </div>
            </div>`;
    }

    let galleryImages = (product.gallery_images && product.gallery_images.length > 0) ? product.gallery_images.filter(Boolean) : (product.image_url ? [product.image_url] : []);
    const mainImage = galleryImages[0] || '/assets/icon-192.png';
    const thumbnailsHtml = galleryImages.length > 1 ? galleryImages.map((url, i) => `<img src="${escapeHTML(url)}" alt="View ${i + 1}" class="gallery-thumb" data-src="${escapeHTML(url)}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid ${i === 0 ? '#FF5A3C' : '#E2E8F0'};transition:border-color 0.2s;">`).join('') : '';
    const videoHtml = product.video_url ? `<div style="background:#fff; padding:30px; border-radius:12px; border:1px solid #E2E8F0; margin-bottom:20px;"><h2 style="margin-bottom:15px; border-bottom:2px solid #FF5A3C; padding-bottom:10px; display:inline-block;">Product Video</h2>${getVideoHtml(product.video_url)}</div>` : '';
    const shareUrl = encodeURIComponent(window.location.href); const shareText = encodeURIComponent(`Check out ${product.title} on PrimePickHub`);

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:40px;background:#fff;padding:30px;border-radius:12px;border:1px solid #E2E8F0;margin-bottom:20px;">
            <div>
                <div style="background:#F8FAFC;border-radius:12px;padding:15px;margin-bottom:15px;">
                    <img id="mainImage" src="${escapeHTML(mainImage)}" alt="${escapeHTML(product.title)}" style="width:100%;max-height:400px;object-fit:contain;border-radius:8px;" onerror="this.src='/assets/icon-192.png';">
                </div>
                ${thumbnailsHtml ? `<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">${thumbnailsHtml}</div>` : ''}
            </div>
            <div>
                <h1 style="font-size:1.8rem;margin-bottom:10px;">${escapeHTML(product.title)}</h1>
                
                <div style="margin-bottom: 20px; background: #F8FAFC; padding: 15px; border-radius: 8px; border: 1px solid #E2E8F0;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
                        <div id="displayPriceContainer"></div>
                        <select id="currencySelector" style="padding: 8px 12px; border-radius: 6px; border: 1px solid #CBD5E1; font-weight: bold; color: #1E1B4B; background: #fff; cursor: pointer; font-size: 1rem;">
                            <option value="${baseCurrency}">${baseCurrency}</option>
                            <optgroup label="South Asia"><option value="PKR">PKR (Rs)</option><option value="INR">INR (₹)</option><option value="BDT">BDT (৳)</option></optgroup>
                            <optgroup label="Middle East"><option value="AED">AED (د.إ)</option><option value="SAR">SAR (ر.س)</option><option value="QAR">QAR (ر.ق)</option><option value="KWD">KWD (د.ك)</option><option value="BHD">BHD (د.ب)</option><option value="OMR">OMR (ر.ع.)</option><option value="TRY">TRY (₺)</option></optgroup>
                            <optgroup label="Americas"><option value="USD">USD ($)</option><option value="CAD">CAD (C$)</option><option value="BRL">BRL (R$)</option><option value="MXN">MXN (MX$)</option></optgroup>
                            <optgroup label="Europe / UK"><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option><option value="CHF">CHF</option><option value="SEK">SEK (kr)</option><option value="NOK">NOK (kr)</option><option value="RUB">RUB (₽)</option></optgroup>
                            <optgroup label="Asia Pacific"><option value="AUD">AUD (A$)</option><option value="NZD">NZD (NZ$)</option><option value="CNY">CNY (¥)</option><option value="JPY">JPY (¥)</option><option value="KRW">KRW (₩)</option><option value="SGD">SGD (S$)</option><option value="HKD">HKD (HK$)</option><option value="MYR">MYR (RM)</option><option value="IDR">IDR (Rp)</option></optgroup>
                            <optgroup label="Africa"><option value="ZAR">ZAR (R)</option></optgroup>
                        </select>
                    </div>
                    <p style="font-size: 0.75rem; color: #64748B; margin: 0;"><i>Real-time rates powered by open.er-api.com</i></p>
                </div>

                <p style="color:#64748B;margin-bottom:20px;">${escapeHTML(product.description || '')}</p>
                
                <div style="background-color:#FEF3C7; border-left:4px solid #F59E0B; padding:12px 15px; margin-bottom:15px; border-radius:6px; display:flex; align-items:flex-start; gap:10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05
