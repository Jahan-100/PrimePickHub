/**
 * Product Detail Page with Real-Time Currency Conversion & Color/Size Selection
 * NOTE: escapeHTML() and getHighQualityImage() are loaded from /js/utils.js
 */

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
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', getHighQualityImage(product.image_url, 800) || '');
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', product.description || '');

    const allOffers = product.affiliate_offers || [];
    const mainOffer = allOffers[0] || { price: '0', store_name: 'Store', currency: 'USD', commission_rate: 0, sale_price: null };
    const otherVariations = allOffers.slice(1);
    
    const allVariations = [mainOffer, ...otherVariations].filter(v => v !== null && v.price !== undefined);
    
    let uniqueColors = [];
    allVariations.forEach(v => {
        if (v.product_color) {
            const colorValues = v.product_color.split(',').map(c => c.trim()).filter(Boolean);
            const colorNames = (v.color_name || '').split(',').map(n => n.trim());
            colorValues.forEach((val, idx) => {
                if (!uniqueColors.find(c => c.value === val)) {
                    uniqueColors.push({
                        value: val,
                        hdValue: getHighQualityImage(val, 400),
                        name: colorNames[idx] || val
                    });
                }
            });
        }
    });
    
    let activeColor = uniqueColors.length > 0 ? uniqueColors[0].value : null;
    let activeOfferIndex = 0;
    let activeSize = null;

    if (activeColor) {
        const idx = allVariations.findIndex(v => v.product_color && v.product_color.includes(activeColor));
        if (idx !== -1) activeOfferIndex = idx;
    }
    
    const initialOffersForColor = activeColor ? allVariations.filter(v => v.product_color && v.product_color.includes(activeColor)) : allVariations;
    let initialAvailableSizes = [];
    initialOffersForColor.forEach(o => {
        if (o.variation_name) {
            o.variation_name.split(',').map(s => s.trim()).filter(Boolean).forEach(s => {
                if (!initialAvailableSizes.includes(s)) initialAvailableSizes.push(s);
            });
        }
    });
    if (initialAvailableSizes.length > 0) activeSize = initialAvailableSizes[0];

    let activeOffer = allVariations[activeOfferIndex];
    const baseCurrency = (mainOffer.currency || 'USD').toUpperCase();

    const renderBuyButton = (offer) => {
        const cfg = CONFIG.networks[offer.store_name?.toLowerCase()] || CONFIG.networks.amazon;
        const bg = /^#[0-9a-fA-F]{6}$/.test(cfg.brandColor) ? cfg.brandColor : '#2563eb';
        const fg = /^#[0-9a-fA-F]{6}$/.test(cfg.textColor) ? cfg.textColor : '#ffffff';
        return `<a href="${escapeHTML(offer.affiliate_url || '#')}" target="_blank" rel="noopener noreferrer sponsored"
                   class="btn-check-price js-affiliate-link"
                   style="background-color:${bg};color:${fg};padding:14px;display:block;text-align:center;font-size:1.1rem;"
                   data-store="${escapeHTML(offer.store_name)}" data-product-id="${escapeHTML(String(product.id))}" data-url="${escapeHTML(offer.affiliate_url)}">
                   Buy on ${escapeHTML(offer.store_name || 'Store')}
                </a>`;
    };

    function generateVariationUI() {
        let html = '';
        if (uniqueColors.length > 0) {
            const activeObj = uniqueColors.find(c => c.value === activeColor);
            html += `<div style="margin-bottom: 20px;">
                <p style="font-weight:bold; margin-bottom:12px; color:#1E1B4B; font-size:1.05rem;">
                    Color: <span style="color: #64748B; font-weight: 500;">${activeObj ? activeObj.name : (activeColor || '')}</span>
                </p>
                <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">`;
            
            uniqueColors.forEach(colorObj => {
                const isActive = colorObj.value === activeColor;
                const isImageUrl = colorObj.value.startsWith('http');
                let boxStyle = '';

                if (isImageUrl) {
                    boxStyle = `background-image: url('${colorObj.hdValue}'); background-size: cover; background-position: center;`;
                } else {
                    const bgColor = getHexFromColorString(colorObj.value);
                    boxStyle = `background-color: ${bgColor};`;
                }

                html += `
                <div style="cursor:pointer;" onclick="selectColor('${colorObj.value}')">
                    <div style="width:50px; height:50px; border-radius:50%; ${boxStyle} border:3px solid ${isActive ? '#FF5A3C' : '#E2E8F0'}; box-shadow:${isActive ? '0 0 0 3px rgba(255,90,60,0.3)' : 'none'}; transition:all 0.2s; box-sizing:border-box;">
                    </div>
                </div>`;
            });
            html += `</div></div>`;
        }

        const offersForColor = activeColor ? allVariations.filter(v => v.product_color && v.product_color.includes(activeColor)) : allVariations;
        let availableSizes = [];
        offersForColor.forEach(o => {
            if (o.variation_name) {
                o.variation_name.split(',').map(s => s.trim()).filter(Boolean).forEach(s => {
                    if (!availableSizes.includes(s)) availableSizes.push(s);
                });
            }
        });

        if (availableSizes.length > 0) {
            if (!activeSize || !availableSizes.includes(activeSize)) activeSize = availableSizes[0];
            html += `<div style="margin-bottom: 15px;">
                <p style="font-weight:bold; margin-bottom:8px;">Size:</p>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">`;
            availableSizes.forEach((size) => {
                const isActive = size === activeSize;
                html += `<button onclick="selectSize('${size}')" style="padding:10px 16px; border:2px solid ${isActive ? '#FF5A3C' : '#E2E8F0'}; background:#fff; border-radius:8px; cursor:pointer; font-weight:bold; color:${isActive ? '#FF5A3C' : '#1E1B4B'}; transition: all 0.2s;">
                    ${size}
                </button>`;
            });
            html += `</div></div>`;
        } else {
            activeSize = null;
        }
        return html;
    }

    let galleryImages = (product.gallery_images && product.gallery_images.length > 0) ? product.gallery_images.filter(Boolean) : (product.image_url ? [product.image_url] : []);
    galleryImages = galleryImages.map(url => getHighQualityImage(url, 800));

    const mainImage = galleryImages[0] || '/assets/icon-192.png';
    const videoHtml = product.video_url ? `<div style="background:#fff; padding:30px; border-radius:12px; border:1px solid #E2E8F0; margin-bottom:20px;"><h2 style="margin-bottom:15px; border-bottom:2px solid #FF5A3C; padding-bottom:10px; display:inline-block;">Product Video</h2>${getVideoHtml(product.video_url)}</div>` : '';
    const shareUrl = encodeURIComponent(window.location.href); const shareText = encodeURIComponent(`Check out ${product.title} on PrimePickHub`);

    const thumbnailsHtml = galleryImages.map((url, i) => `
        <img src="${escapeHTML(getHighQualityImage(url, 150))}" alt="View ${i + 1}" 
             class="gallery-thumb" data-src="${escapeHTML(url)}" data-index="${i}"
             style="border:2px solid ${i === 0 ? '#FF5A3C' : '#E2E8F0'};">
    `).join('');

    // ✅ Expert Verdict Preview (Google Ads Value Content)
    const reviewPreview = product.review_html 
        ? product.review_html.replace(/<[^>]*>/g, '').trim().substring(0, 220) + (product.review_html.length > 220 ? '…' : '')
        : 'Our detailed expert review is being prepared. Check full specs, live price, and availability below.';

    container.innerHTML = `
        <div class="product-layout">
            <div class="product-thumbnails-section">
                <button class="scroll-arrow up-arrow" onclick="scrollThumbnails('up')" aria-label="Scroll Up"><i class="fa-solid fa-chevron-up"></i></button>
                <div id="thumbnailContainer" class="thumbnail-scroll-wrapper">
                    ${thumbnailsHtml}
                </div>
                <button class="scroll-arrow down-arrow" onclick="scrollThumbnails('down')" aria-label="Scroll Down"><i class="fa-solid fa-chevron-down"></i></button>
            </div>

            <div class="product-image-section">
                <div id="mainImageWrapper" style="background:#F8FAFC;border-radius:12px;padding:15px;display:flex;align-items:center;justify-content:center;position:relative; height: 100%; overflow: hidden;">
                    <img id="mainImage" src="${escapeHTML(mainImage)}" alt="${escapeHTML(product.title)}" 
                         style="width:100%;height:auto;max-height:800px;object-fit:contain;border-radius:8px;cursor:zoom-in;">
                    
                    <button class="main-arrow left" onclick="event.stopPropagation(); changeMainImage(-1)" aria-label="Previous Image"><i class="fa-solid fa-chevron-left"></i></button>
                    <button class="main-arrow right" onclick="event.stopPropagation(); changeMainImage(1)" aria-label="Next Image"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>

            <div class="product-info-section">
                <h1 style="font-size:1.8rem;margin-bottom:10px;">${escapeHTML(product.title)}</h1>
                <div style="margin-bottom: 20px; background: #F8FAFC; padding: 15px; border-radius: 8px; border: 1px solid #E2E8F0;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
                        <div id="displayPriceContainer"></div>
                        <select id="currencySelector" aria-label="Select Currency" style="padding: 8px 12px; border-radius: 6px; border: 1px solid #CBD5E1; font-weight: bold; color: #1E1B4B; background: #fff; cursor: pointer; font-size: 1rem;">
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

                <!-- ✅ Expert Verdict (Value Content for Google Ads) -->
                <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:15px; margin-bottom:15px;">
                    <h3 style="color:#166534; margin-bottom:6px; font-size:1.05rem; font-family:'Poppins',sans-serif;">📝 Expert Verdict</h3>
                    <p style="color:#334155; line-height:1.6; margin:0; font-size:0.9rem;">${escapeHTML(reviewPreview)}</p>
                </div>
                
                <div style="background-color:#FEF3C7; border-left:4px solid #F59E0B; padding:12px 15px; margin-bottom:15px; border-radius:6px; display:flex; align-items:flex-start; gap:10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <i class="fa-solid fa-circle-info" style="color:#D97706; font-size:1.2rem; margin-top:2px;"></i>
                    <p style="font-size:0.95rem; color:#92400E; margin:0; font-weight:600; line-height:1.5;">
                        Important: You will be redirected to the official store to confirm live price, stock, and delivery.
                    </p>
                </div>

                <div id="variationContainer">${generateVariationUI()}</div>
                <div style="margin-bottom:25px;padding:15px;background:#F8FAFC;border-radius:8px;" id="buyButtonContainer"></div>
                
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <a href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank" rel="noopener" style="padding:8px 16px;background:#25D366;color:#fff;border-radius:6px;text-decoration:none;font-size:0.9rem;">Share on WhatsApp</a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener" style="padding:8px 16px;background:#1877F2;color:#fff;border-radius:6px;text-decoration:none;font-size:0.9rem;">Share on Facebook</a>
                </div>
            </div>
        </div>

        <!-- ✅ Full Review Section (Moved UP for Google Ads compliance) -->
        <div id="fullReview" style="background:#fff;padding:30px;border-radius:12px;border:1px solid #E2E8F0; margin-top: 20px;">
            <h2 style="margin-bottom:20px;border-bottom:2px solid #FF5A3C;padding-bottom:10px;display:inline-block;font-family:'Poppins',sans-serif;">Our Detailed Review</h2>
            <div style="color:#334155;line-height:1.8;font-size:1.05rem;">${product.review_html || '<p>Detailed review coming soon...</p>'}</div>
        </div>

        ${videoHtml}

        <div id="fullScreenImageModal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.95); z-index:9999999; align-items:center; justify-content:center; overflow:hidden;">
            <div id="zoomPanContainer" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; cursor:zoom-in; overflow:hidden;">
                <img id="fullScreenImageSrc" src="" alt="Full Screen Product Image" 
                     style="max-width:95vw; max-height:85vh; object-fit:contain; user-select:none; -webkit-user-drag:none; transition: transform 0.1s ease-out;">
            </div>
            
            <div style="position:absolute; bottom:30px; left:0; width:100%; display:flex; justify-content:center; align-items:center; gap:20px; pointer-events:none;">
                <button onclick="changeFullScreenImage(-1, event)" aria-label="Previous Image" 
                        style="pointer-events:auto; background:rgba(255,255,255,0.9); color:#000; border:none; width:50px; height:50px; border-radius:50%; cursor:pointer; font-size:1.5rem; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.3);">&#10094;</button>
                <button onclick="closeFullScreenImage(event)" aria-label="Close Image Viewer" 
                        style="pointer-events:auto; background:rgba(255,255,255,0.9); color:#000; border:none; width:60px; height:60px; border-radius:50%; cursor:pointer; font-size:2rem; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.3);">&times;</button>
                <button onclick="changeFullScreenImage(1, event)" aria-label="Next Image" 
                        style="pointer-events:auto; background:rgba(255,255,255,0.9); color:#000; border:none; width:50px; height:50px; border-radius:50%; cursor:pointer; font-size:1.5rem; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.3);">&#10095;</button>
            </div>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        #productContainer { padding: 10px 15px !important; max-width: 100% !important; }
        .product-layout { display: flex; flex-direction: row; width: 100%; max-width: 100%; gap: 20px; background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #E2E8F0; box-sizing: border-box; align-items: flex-start; }
        .product-thumbnails-section { width: 80px; height: 600px; flex-shrink: 0; position: sticky; top: 100px; display: flex; flex-direction: column; align-items: center; }
        .product-thumbnails-section .scroll-arrow { position: absolute !important; top: auto !important; bottom: auto !important; transform: none !important; left: 50% !important; margin-left: -16px !important; width: 32px; height: 32px; background: #fff; border: 1px solid #CBD5E1; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.1); color: #1E1B4B; font-size: 0.8rem; }
        .product-thumbnails-section .scroll-arrow.up-arrow { top: 0 !important; }
        .product-thumbnails-section .scroll-arrow.down-arrow { bottom: 0 !important; }
        .thumbnail-scroll-wrapper { position: absolute !important; top: 40px !important; bottom: 40px !important; left: 0 !important; right: 0 !important; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; scrollbar-width: none; align-items: center; padding: 0 !important; }
        .thumbnail-scroll-wrapper::-webkit-scrollbar { display: none; }
        .product-image-section { flex: 1; min-width: 0; position: sticky; top: 100px; height: auto; }
        .main-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; background: rgba(255, 255, 255, 0.8); border: 1px solid #E2E8F0; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 5; color: #1E1B4B; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.2s; opacity: 0.8; }
        .main-arrow:hover { opacity: 1; background: #fff; }
        .main-arrow.left { left: 10px; }
        .main-arrow.right { right: 10px; }
        .product-info-section { width: 420px; flex-shrink: 0; }
        .gallery-thumb { width: 70px; height: 70px; object-fit: cover; border-radius: 8px; cursor: pointer; transition: border-color 0.2s; flex-shrink: 0; }
        @media (max-width: 1023px) {
            .product-layout { flex-direction: column; padding: 10px; gap: 15px; }
            .product-image-section { width: 100%; position: relative; top: 0; }
            .product-info-section { width: 100%; }
            .product-thumbnails-section { width: 100%; height: 90px; flex-direction: row; position: relative; top: 0; margin-bottom: 10px; padding: 0 10px; }
            .product-thumbnails-section .scroll-arrow { top: 50% !important; transform: translateY(-50%) !important; left: auto !important; margin-left: 0 !important; width: 30px; height: 30px; }
            .product-thumbnails-section .scroll-arrow.up-arrow { left: 0 !important; top: 50% !important; transform: translateY(-50%) rotate(-90deg) !important; }
            .product-thumbnails-section .scroll-arrow.down-arrow { right: 0 !important; left: auto !important; top: 50% !important; transform: translateY(-50%) rotate(-90deg) !important; bottom: auto !important; }
            .thumbnail-scroll-wrapper { flex-direction: row !important; position: absolute !important; top: 0 !important; bottom: 0 !important; left: 35px !important; right: 35px !important; overflow-x: auto !important; overflow-y: hidden !important; padding: 0 10px !important; }
            .main-arrow { display: none; }
        }
    `;
    document.head.appendChild(style);

    const currencySelector = document.getElementById('currencySelector');
    const displayPriceContainer = document.getElementById('displayPriceContainer');
    const buyButtonContainer = document.getElementById('buyButtonContainer');
    let exchangeRates = {};

    async function fetchRates() {
        try {
            const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
            const data = await res.json();
            if (data.result === "success") exchangeRates = data.rates; else throw new Error("API failed");
        } catch (err) {
            exchangeRates = { USD: 1, PKR: 278.5, EUR: 0.92, GBP: 0.79, INR: 83.2, AED: 3.67, CAD: 1.36, AUD: 1.52, SAR: 3.75, CNY: 7.23, JPY: 149.5 };
        }
    }

    function updateUI(currency) {
        const rate = exchangeRates[currency] || 1;
        activeOffer = allVariations[activeOfferIndex]; 
        const basePrice = parseFloat(activeOffer.price) || 0;
        const salePrice = parseFloat(activeOffer.sale_price) || 0;
        const commissionRate = parseFloat(activeOffer.commission_rate) || 0;
        let finalBasePrice = basePrice; let finalSalePrice = salePrice;
        if (commissionRate > 0) {
            finalBasePrice = basePrice + (basePrice * (commissionRate / 100));
            if (salePrice > 0) finalSalePrice = salePrice + (salePrice * (commissionRate / 100));
        }

        let priceHtml = '';
        
        if (basePrice === 0) {
            const storeName = activeOffer.store_name || 'Store';
            priceHtml = `<div style="font-size: 1.2rem; font-weight: bold; color: #FF5A3C;">Check Price on ${escapeHTML(storeName)}</div>`;
        } else if (salePrice > 0) {
            const convertedSale = finalSalePrice * rate; const convertedOrig = finalBasePrice * rate;
            const symbol = currencySymbols[currency] || currency + ' ';
            priceHtml = `<div style="display:flex; align-items:center; gap:10px;"><span style="text-decoration:line-through; color:#64748B; font-size:1.2rem;">${symbol}${convertedOrig.toFixed(2)}</span><span style="font-size: 1.6rem; font-weight: bold; color: #FF5A3C;">${symbol}${convertedSale.toFixed(2)}</span></div>`;
        } else {
            const converted = finalBasePrice * rate; const symbol = currencySymbols[currency] || currency + ' ';
            priceHtml = `<div style="display:flex; align-items:center; gap:10px;"><span style="font-size: 1.6rem; font-weight: bold; color: #FF5A3C;">${symbol}${converted.toFixed(2)}</span></div>`;
        }
        
        displayPriceContainer.innerHTML = priceHtml;
        buyButtonContainer.innerHTML = renderBuyButton(activeOffer);
    }

    await fetchRates(); updateUI(baseCurrency);
    currencySelector.addEventListener('change', (e) => updateUI(e.target.value));

    window.selectColor = function(colorValue) {
        activeColor = colorValue;
        let imageUrl = null;
        if (colorValue.includes('|')) {
            const parts = colorValue.split('|');
            if (parts.length > 1) imageUrl = parts[1].trim();
        } else if (colorValue.startsWith('http')) {
            imageUrl = colorValue;
        }
        if (imageUrl && imageUrl.startsWith('http')) {
            const existingIndex = galleryImages.findIndex(img => img === getHighQualityImage(imageUrl, 800));
            if (existingIndex !== -1) {
                changeMainImage(existingIndex, false); 
            } else {
                document.getElementById('mainImage').src = getHighQualityImage(imageUrl, 800);
                galleryImages[0] = getHighQualityImage(imageUrl, 800);
                window.currentMainImageIndex = 0;
            }
        }
        const offersForColor = allVariations.filter(v => v.product_color && v.product_color.includes(colorValue));
        let availableSizes = [];
        offersForColor.forEach(o => {
            if (o.variation_name) {
                o.variation_name.split(',').map(s => s.trim()).filter(Boolean).forEach(s => {
                    if (!availableSizes.includes(s)) availableSizes.push(s);
                });
            }
        });
        if (availableSizes.length > 0) { if (!availableSizes.includes(activeSize)) activeSize = availableSizes[0]; }
        else { activeSize = null; }
        let idxExact = allVariations.findIndex(v => v.product_color && v.product_color.includes(colorValue) && (activeSize ? v.variation_name && v.variation_name.trim() === activeSize : true));
        let idxPartial = allVariations.findIndex(v => v.product_color && v.product_color.includes(colorValue) && (activeSize ? v.variation_name && v.variation_name.split(',').map(s=>s.trim()).includes(activeSize) : true));
        if (idxExact !== -1) activeOfferIndex = idxExact;
        else if (idxPartial !== -1) activeOfferIndex = idxPartial;
        else if (offersForColor.length > 0) activeOfferIndex = allVariations.indexOf(offersForColor[0]);
        activeOffer = allVariations[activeOfferIndex];
        document.getElementById('variationContainer').innerHTML = generateVariationUI();
        updateUI(currencySelector.value);
    };

    window.selectSize = function(size) {
        activeSize = size;
        let idxExact = allVariations.findIndex(v => v.variation_name && v.variation_name.trim() === size && (!activeColor || (v.product_color && v.product_color.includes(activeColor))));
        let idxPartial = allVariations.findIndex(v => v.variation_name && v.variation_name.split(',').map(s=>s.trim()).includes(size) && (!activeColor || (v.product_color && v.product_color.includes(activeColor))));
        if (idxExact !== -1) activeOfferIndex = idxExact;
        else if (idxPartial !== -1) activeOfferIndex = idxPartial;
        activeOffer = allVariations[activeOfferIndex];
        document.getElementById('variationContainer').innerHTML = generateVariationUI();
        updateUI(currencySelector.value);
    };

    window.scrollThumbnails = function(direction) {
        const container = document.getElementById('thumbnailContainer');
        const scrollAmount = 150;
        if (window.innerWidth > 1023) {
            if (direction === 'up') container.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
            else container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        } else {
            if (direction === 'up') container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            else container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    window.currentMainImageIndex = 0;

    window.changeMainImage = function(indexOrDirection, isDirection = true) {
        if (isDirection) {
            let newIndex = window.currentMainImageIndex + indexOrDirection;
            if (newIndex < 0) newIndex = galleryImages.length - 1;
            if (newIndex >= galleryImages.length) newIndex = 0;
            window.currentMainImageIndex = newIndex;
        } else {
            window.currentMainImageIndex = indexOrDirection;
        }
        document.getElementById('mainImage').src = galleryImages[window.currentMainImageIndex];
        container.querySelectorAll('.gallery-thumb').forEach((t, i) => {
            t.style.borderColor = (i === window.currentMainImageIndex) ? '#FF5A3C' : '#E2E8F0';
        });
    };

    let mainTouchStart = 0;
    const mainWrapper = document.getElementById('mainImageWrapper');
    mainWrapper.addEventListener('touchstart', e => { mainTouchStart = e.changedTouches[0].screenX; }, { passive: true });
    mainWrapper.addEventListener('touchend', e => {
        let mainTouchEnd = e.changedTouches[0].screenX;
        if (mainTouchEnd < mainTouchStart - 50) changeMainImage(1);
        if (mainTouchEnd > mainTouchStart + 50) changeMainImage(-1);
    }, { passive: true });

    mainWrapper.addEventListener('click', function(e) {
        if (e.target.closest('.main-arrow')) return;
        window.openFullScreenImage(window.currentMainImageIndex);
    });

    container.querySelectorAll('.gallery-thumb').forEach((thumb, index) => {
        thumb.addEventListener('click', function () {
            changeMainImage(index, false);
        });
    });

    const modal = document.getElementById('fullScreenImageModal');
    const zoomPanContainer = document.getElementById('zoomPanContainer');
    const imgElement = document.getElementById('fullScreenImageSrc');

    let scale = 1;
    let isDragging = false;
    let wasDragged = false;
    let startX, startY, translateX = 0, translateY = 0;

    function updateTransform() {
        imgElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        if (scale > 1) zoomPanContainer.style.cursor = isDragging ? 'grabbing' : 'grab';
        else zoomPanContainer.style.cursor = 'zoom-in';
    }

    function resetZoomPan() {
        scale = 1; translateX = 0; translateY = 0;
        updateTransform();
    }

    window.openFullScreenImage = function(index) {
        window.currentMainImageIndex = index; 
        imgElement.src = galleryImages[window.currentMainImageIndex];
        resetZoomPan();
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; 
    };

    window.closeFullScreenImage = function(e) {
        if (e) e.stopPropagation(); 
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; 
    };

    window.changeFullScreenImage = function(direction, e) {
        if (e) e.stopPropagation();
        if (galleryImages.length <= 1) return;
        let newIndex = window.currentMainImageIndex + direction;
        if (newIndex < 0) newIndex = galleryImages.length - 1;
        if (newIndex >= galleryImages.length) newIndex = 0;
        
        window.currentMainImageIndex = newIndex;
        imgElement.src = galleryImages[window.currentMainImageIndex];
        resetZoomPan();
        
        document.getElementById('mainImage').src = galleryImages[window.currentMainImageIndex];
        container.querySelectorAll('.gallery-thumb').forEach((t, i) => {
            t.style.borderColor = (i === window.currentMainImageIndex) ? '#FF5A3C' : '#E2E8F0';
        });
    };

    zoomPanContainer.addEventListener('click', (e) => {
        if (wasDragged) { wasDragged = false; return; } 
        if (scale === 1) { scale = 2.5; updateTransform(); } else { resetZoomPan(); }
    });

    zoomPanContainer.addEventListener('mousedown', (e) => {
        if (scale <= 1) return; 
        isDragging = true;
        wasDragged = false;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        updateTransform();
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        wasDragged = true;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        updateTransform();
    });

    zoomPanContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) scale = Math.min(scale + 0.5, 5);
        else scale = Math.max(scale - 0.5, 1);
        
        if (scale === 1) { translateX = 0; translateY = 0; }
        updateTransform();
    }, { passive: false });

    let initialDistance = 0, initialScale = 1;
    let touchStartX = 0, touchStartY = 0;

    zoomPanContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            initialScale = scale;
        } else if (e.touches.length === 1) {
            if (scale > 1) {
                isDragging = true;
                wasDragged = false;
                startX = e.touches[0].clientX - translateX;
                startY = e.touches[0].clientY - translateY;
            } else {
                wasDragged = false;
            }
        }
    }, { passive: false });

    zoomPanContainer.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const distance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            scale = Math.max(1, Math.min(initialScale * (distance / initialDistance), 5));
            updateTransform();
        } else if (e.touches.length === 1 && isDragging) {
            e.preventDefault();
            wasDragged = true;
            translateX = e.touches[0].clientX - startX;
            translateY = e.touches[0].clientY - startY;
            updateTransform();
        }
    }, { passive: false });

    zoomPanContainer.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            updateTransform();
        } else if (!wasDragged && scale === 1) {
            scale = 2.5;
            updateTransform();
        } else if (!wasDragged && scale > 1) {
            resetZoomPan();
        }
    });

    // ✅ JSON-LD Product Schema (already existed)
    const jsonLd = {
        "@context": "https://schema.org/", "@type": "Product", "name": product.title,
        "image": [getHighQualityImage(product.image_url, 800)].concat((product.gallery_images || []).map(u => getHighQualityImage(u, 800))).filter(Boolean),
        "description": product.description || product.title,
        "offers": allOffers.map(o => {
            const p = parseFloat(o.price) || 0; 
            const sp = parseFloat(o.sale_price) || 0;
            const c = parseFloat(o.commission_rate) || 0;
            let finalP = sp > 0 ? sp : p;
            if (c > 0) finalP = finalP + (finalP * (c / 100));
            return { "@type": "Offer", "url": o.affiliate_url, "priceCurrency": o.currency || "USD", "price": finalP.toFixed(2), "availability": "https://schema.org/InStock", "seller": { "@type": "Organization", "name": o.store_name } };
        })
    };
    if (product.rating && product.reviews_count > 0) jsonLd.aggregateRating = { "@type": "AggregateRating", "ratingValue": product.rating, "reviewCount": product.reviews_count };
    const script = document.createElement('script'); script.type = 'application/ld+json'; script.text = JSON.stringify(jsonLd); document.head.appendChild(script);

    // ✅ NEW: FAQ Schema (Google Rich Snippets)
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": `Is ${product.title} worth buying?`,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": product.review_html 
                        ? product.review_html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 300)
                        : `${product.title} is available at competitive prices. Check the live price on ${mainOffer.store_name || 'the official store'} before purchasing.`
                }
            },
            {
                "@type": "Question",
                "name": `Where can I buy ${product.title}?`,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": `You can buy ${product.title} from ${mainOffer.store_name || 'the official store'}. Click the "Buy Now" button to check the latest price and availability.`
                }
            },
            {
                "@type": "Question",
                "name": `What is the price of ${product.title}?`,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": `The price starts at ${mainOffer.sale_price || mainOffer.price || 'check live'} ${mainOffer.currency || 'USD'}. Prices may change — please check the live price on the store before ordering.`
                }
            }
        ]
    };
    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.text = JSON.stringify(faqSchema);
    document.head.appendChild(faqScript);

    // ✅ NEW: Breadcrumb Schema
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": window.location.origin
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": product.category_slug ? product.category_slug.replace(/-/g, ' ') : "Products",
                "item": `${window.location.origin}/category.html?cat=${product.category_slug || ''}`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": product.title
            }
        ]
    };
    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.text = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(bcScript);
});

function getHexFromColorString(colorStr) {
    if (!colorStr) return '#e2e8f0';
    if (colorStr.startsWith('#')) return colorStr;
    const c = colorStr.toLowerCase();
    if (c.includes('black')) return '#111827';
    if (c.includes('coffee') || c.includes('brown') || c.includes('taupe')) return '#9C7B5C';
    if (c.includes('khaki') || c.includes('camel')) return '#C3B091';
    if (c.includes('beige') || c.includes('cream') || c.includes('off-white')) return '#E8DCC4';
    if (c.includes('white')) return '#ffffff';
    if (c.includes('red')) return '#ef4444';
    if (c.includes('maroon') || c.includes('burgundy')) return '#800000';
    if (c.includes('blue')) return '#3b82f6';
    if (c.includes('navy')) return '#1e3a8a';
    if (c.includes('sky') || c.includes('light-blue')) return '#7dd3fc';
    if (c.includes('green')) return '#10b981';
    if (c.includes('olive') || c.includes('army')) return '#84cc16';
    if (c.includes('mint')) return '#a7f3d0';
    if (c.includes('grey') || c.includes('gray')) return '#9ca3af';
    if (c.includes('yellow') || c.includes('mustard')) return '#facc15';
    if (c.includes('pink')) return '#ec4899';
    if (c.includes('purple')) return '#a855f7';
    if (c.includes('orange')) return '#f97316';
    let hash = 0;
    for (let i = 0; i < colorStr.length; i++) { hash = colorStr.charCodeAt(i) + ((hash << 5) - hash); }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 70%)`;
}

const currencySymbols = {
    USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ', 
    SAR: 'SAR ', CAD: 'C$', AUD: 'A$', CNY: '¥', JPY: '¥', TRY: '₺', 
    BDT: '৳', MYR: 'RM ', IDR: 'Rp ', QAR: 'QAR ', KWD: 'KWD ', 
    BHD: 'BHD ', OMR: 'OMR ', ZAR: 'R ', BRL: 'R$', MXN: 'MX$', 
    RUB: '₽', KRW: '₩', SGD: 'S$', HKD: 'HK$', NZD: 'NZ$', 
    CHF: 'CHF ', SEK: 'kr ', NOK: 'kr '
};
