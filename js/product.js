/**
 * Product Detail Page with Real-Time Currency Conversion & Color/Size Selection
 */
function escapeHTML(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ⭐ UPGRADED HD IMAGE HELPER ⭐
function getHighQualityImage(url) {
    if (!url || typeof url !== 'string') return url;
    let cleanUrl = url;

    if (cleanUrl.includes('aliexpress') || cleanUrl.includes('daraz') || cleanUrl.includes('alicdn')) {
        const match = cleanUrl.match(/^(.+?\.(?:jpg|jpeg|png|webp))_.+/i);
        if (match) cleanUrl = match[1];
    }

    if (cleanUrl.includes('amazon') || cleanUrl.includes('media-amazon')) {
        const match = cleanUrl.match(/\._[A-Z0-9_,]+_\.(jpg|jpeg|png|webp)/i);
        if (match) cleanUrl = cleanUrl.replace(/\._[A-Z0-9_,]+_\.(jpg|jpeg|png|webp)/i, '.$1');
    }

    if (cleanUrl.includes('ebayimg.com')) {
        cleanUrl = cleanUrl.replace(/\/s-l\d+\.(jpg|jpeg|png|webp)/i, '/s-l1600.$1');
    }

    if (cleanUrl.includes('shopify') || cleanUrl.includes('govee')) {
        cleanUrl = cleanUrl.replace(/_(small|medium|large|\d+x\d*|\d*x\d+)(\.(jpg|jpeg|png|webp))/i, '$2');
        if (cleanUrl.includes('?')) cleanUrl = cleanUrl.split('?')[0]; 
    }

    cleanUrl = cleanUrl.replace(/[_-]\d+x\d+(?=\.(jpg|jpeg|png|webp|avif))/i, '');
    cleanUrl = cleanUrl.replace(/_\d+x(?=\.(jpg|jpeg|png|webp|avif))/i, '');

    return cleanUrl;
}

const currencySymbols = {
    USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ', 
    SAR: 'SAR ', CAD: 'C$', AUD: 'A$', CNY: '¥', JPY: '¥', TRY: '₺', 
    BDT: '৳', MYR: 'RM ', IDR: 'Rp ', QAR: 'QAR ', KWD: 'KWD ', 
    BHD: 'BHD ', OMR: 'OMR ', ZAR: 'R ', BRL: 'R$', MXN: 'MX$', 
    RUB: '₽', KRW: '₩', SGD: 'S$', HKD: 'HK$', NZD: 'NZ$', 
    CHF: 'CHF ', SEK: 'kr ', NOK: 'kr '
};

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
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', getHighQualityImage(product.image_url) || '');
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
                        hdValue: getHighQualityImage(val),
                        name: colorNames[idx] || val
                    });
                }
            });
        }
    });
    
    let activeColor = uniqueColors.length > 0 ? uniqueColors[0].value : null;
    let activeOfferIndex = 0;
    
    if (activeColor) {
        const idx = allVariations.findIndex(v => v.product_color && v.product_color.includes(activeColor));
        if (idx !== -1) activeOfferIndex = idx;
    }
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
                    Color: <span style="color: #64748B; font-weight: 500;">${activeObj ? activeObj.name : activeColor || ''}</span>
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
                    <div style="width:50px; height:50px; border-radius:6px; ${boxStyle} border:3px solid ${isActive ? '#FF5A3C' : '#E2E8F0'}; box-shadow:${isActive ? '0 0 0 3px rgba(255,90,60,0.3)' : 'none'}; transition:all 0.2s; box-sizing:border-box;">
                    </div>
                </div>`;
            });
            html += `</div></div>`;
        }

        const offersForColor = activeColor ? allVariations.filter(v => v.product_color && v.product_color.includes(activeColor)) : allVariations;
        
        if (offersForColor.some(o => o.variation_name)) {
            html += `<div style="margin-bottom: 15px;">
                <p style="font-weight:bold; margin-bottom:8px;">Size:</p>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">`;

            offersForColor.forEach((offer) => {
                const originalIndex = allVariations.indexOf(offer);
                const isActive = originalIndex === activeOfferIndex;
                
                html += `<button onclick="selectOffer(${originalIndex})" style="padding:10px 16px; border:2px solid ${isActive ? '#FF5A3C' : '#E2E8F0'}; background:#fff; border-radius:8px; cursor:pointer; font-weight:bold; color:${isActive ? '#FF5A3C' : '#1E1B4B'}; transition: all 0.2s;">
                    ${offer.variation_name || 'Default'}
                </button>`;
            });
            html += `</div></div>`;
        }
        
        return html;
    }

    let galleryImages = (product.gallery_images && product.gallery_images.length > 0) ? product.gallery_images.filter(Boolean) : (product.image_url ? [product.image_url] : []);
    galleryImages = galleryImages.map(getHighQualityImage);

    const mainImage = galleryImages[0] || '/assets/icon-192.png';
    const thumbnailsHtml = galleryImages.length > 1 ? galleryImages.map((url, i) => `<img src="${escapeHTML(url)}" alt="View ${i + 1}" class="gallery-thumb" data-src="${escapeHTML(url)}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid ${i === 0 ? '#FF5A3C' : '#E2E8F0'};transition:border-color 0.2s;">`).join('') : '';
    const videoHtml = product.video_url ? `<div style="background:#fff; padding:30px; border-radius:12px; border:1px solid #E2E8F0; margin-bottom:20px;"><h2 style="margin-bottom:15px; border-bottom:2px solid #FF5A3C; padding-bottom:10px; display:inline-block;">Product Video</h2>${getVideoHtml(product.video_url)}</div>` : '';
    const shareUrl = encodeURIComponent(window.location.href); const shareText = encodeURIComponent(`Check out ${product.title} on PrimePickHub`);

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:40px;background:#fff;padding:30px;border-radius:12px;border:1px solid #E2E8F0;margin-bottom:20px;">
            <div>
                <div style="background:#F8FAFC;border-radius:12px;padding:15px;margin-bottom:15px;">
                    <img id="mainImage" src="${escapeHTML(mainImage)}" alt="${escapeHTML(product.title)}" style="width:100%;max-height:400px;object-fit:contain;border-radius:8px; cursor: pointer;" onclick="openFullScreenImage(0)" onerror="this.src='/assets/icon-192.png';">
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
        ${videoHtml}
        <div style="background:#fff;padding:30px;border-radius:12px;border:1px solid #E2E8F0;">
            <h2 style="margin-bottom:20px;border-bottom:2px solid #FF5A3C;padding-bottom:10px;display:inline-block;">Our Detailed Review</h2>
            <div style="color:#334155;line-height:1.8;font-size:1.05rem;">${product.review_html || '<p>Detailed review coming soon...</p>'}</div>
        </div>

        <!-- ⭐ FULL SCREEN IMAGE SLIDER MODAL ⭐ -->
        <div id="fullScreenImageModal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.9); z-index:9999999; align-items:center; justify-content:center; flex-direction:column; touch-action: pan-y;">
            <!-- Close Button -->
            <button onclick="closeFullScreenImage(event)" style="position:absolute; top:20px; right:20px; background:rgba(0,0,0,0.5); border:none; color:white; font-size:2.5rem; cursor:pointer; z-index:10000000; width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center;">&times;</button>
            
            <!-- Arrows (Visible on Mobile too) -->
            <button id="prevImageBtn" onclick="changeFullScreenImage(-1, event)" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.2); color:white; border:none; font-size:2rem; cursor:pointer; border-radius:50%; width:45px; height:45px; display:flex; align-items:center; justify-content:center; z-index:10000000;">&#10094;</button>
            <button id="nextImageBtn" onclick="changeFullScreenImage(1, event)" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.2); color:white; border:none; font-size:2rem; cursor:pointer; border-radius:50%; width:45px; height:45px; display:flex; align-items:center; justify-content:center; z-index:10000000;">&#10095;</button>
            
            <!-- Image -->
            <img id="fullScreenImageSrc" src="" style="max-width:95vw; max-height:85vh; object-fit:contain; user-select:none; border-radius:8px;">
            
            <!-- Image Counter -->
            <div id="imageCounter" style="position:absolute; bottom:20px; color:white; font-size:1.1rem; font-weight:bold; background:rgba(0,0,0,0.6); padding:5px 15px; border-radius:20px;">1 / 1</div>
        </div>
    `;

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
        
        let finalBasePrice = basePrice;
        let finalSalePrice = salePrice;

        if (commissionRate > 0) {
            finalBasePrice = basePrice + (basePrice * (commissionRate / 100));
            if (salePrice > 0) {
                finalSalePrice = salePrice + (salePrice * (commissionRate / 100));
            }
        }
        
        let priceHtml = '';

        if (salePrice > 0) {
            const convertedSale = finalSalePrice * rate;
            const convertedOrig = finalBasePrice * rate;
            const symbol = currencySymbols[currency] || currency + ' ';

            priceHtml = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="text-decoration:line-through; color:#94A3B8; font-size:1.2rem;">${symbol}${convertedOrig.toFixed(2)}</span>
                    <span style="font-size: 1.6rem; font-weight: bold; color: #FF5A3C;">${symbol}${convertedSale.toFixed(2)}</span>
                </div>`;
        } else {
            const converted = finalBasePrice * rate;
            const symbol = currencySymbols[currency] || currency + ' ';
            priceHtml = `<div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size: 1.6rem; font-weight: bold; color: #FF5A3C;">${symbol}${converted.toFixed(2)}</span>
                        </div>`;
        }

        displayPriceContainer.innerHTML = priceHtml;
        buyButtonContainer.innerHTML = renderBuyButton(activeOffer);
    }

    await fetchRates(); updateUI(baseCurrency);
    currencySelector.addEventListener('change', (e) => updateUI(e.target.value));

    window.selectColor = function(colorValue) {
        activeColor = colorValue;
        const idx = allVariations.findIndex(v => v.product_color && v.product_color.includes(colorValue));
        if (idx !== -1) activeOfferIndex = idx;
        
        activeOffer = allVariations[activeOfferIndex];
        document.getElementById('variationContainer').innerHTML = generateVariationUI();
        updateUI(currencySelector.value);
    };

    window.selectOffer = function(index) {
        activeOfferIndex = index;
        activeOffer = allVariations[activeOfferIndex];
        document.getElementById('variationContainer').innerHTML = generateVariationUI();
        updateUI(currencySelector.value);
    };

    // ⭐ FULL SCREEN IMAGE LOGIC ⭐
    let currentFullScreenIndex = 0;
    const modal = document.getElementById('fullScreenImageModal');

    window.openFullScreenImage = function(index) {
        currentFullScreenIndex = index;
        const img = document.getElementById('fullScreenImageSrc');
        
        img.src = galleryImages[currentFullScreenIndex];
        document.getElementById('imageCounter').innerText = `${currentFullScreenIndex + 1} / ${galleryImages.length}`;
        
        const prevBtn = document.getElementById('prevImageBtn');
        const nextBtn = document.getElementById('nextImageBtn');
        if (galleryImages.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'flex';
            nextBtn.style.display = 'flex';
        }

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

        currentFullScreenIndex += direction;
        
        if (currentFullScreenIndex < 0) currentFullScreenIndex = galleryImages.length - 1;
        if (currentFullScreenIndex >= galleryImages.length) currentFullScreenIndex = 0;
        
        const img = document.getElementById('fullScreenImageSrc');
        img.src = galleryImages[currentFullScreenIndex];
        document.getElementById('imageCounter').innerText = `${currentFullScreenIndex + 1} / ${galleryImages.length}`;
    };

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (modal.style.display === 'flex') {
            if (e.key === 'ArrowLeft') window.changeFullScreenImage(-1);
            if (e.key === 'ArrowRight') window.changeFullScreenImage(1);
            if (e.key === 'Escape') window.closeFullScreenImage();
        }
    });

    // ⭐ MOBILE TOUCH SWIPE LOGIC ⭐
    let touchStartX = 0;
    let touchEndX = 0;

    modal.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    modal.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50; // Minimum distance to consider it a swipe
        if (touchEndX < touchStartX - swipeThreshold) {
            // Swiped Left -> Next Image
            window.changeFullScreenImage(1);
        }
        if (touchEndX > touchStartX + swipeThreshold) {
            // Swiped Right -> Prev Image
            window.changeFullScreenImage(-1);
        }
    }

    // Thumbnail click
    container.querySelectorAll('.gallery-thumb').forEach((thumb, index) => {
        thumb.addEventListener('click', function () {
            const src = this.dataset.src;
            document.getElementById('mainImage').src = src;
            container.querySelectorAll('.gallery-thumb').forEach(t => t.style.borderColor = '#E2E8F0');
            this.style.borderColor = '#FF5A3C';
            
            window.openFullScreenImage(index);
        });
    });

    // Background click to close
    modal.addEventListener('click', function(e) {
        if (e.target === this || e.target.id === 'fullScreenImageSrc') {
            window.closeFullScreenImage();
        }
    });

    const jsonLd = {
        "@context": "https://schema.org/", "@type": "Product", "name": product.title,
        "image": [getHighQualityImage(product.image_url)].concat((product.gallery_images || []).map(getHighQualityImage)).filter(Boolean),
        "description": product.description || product.title,
        "offers": allOffers.map(o => {
            const p = parseFloat(o.price) || 0; 
            const sp = parseFloat(o.sale_price) || 0;
            const c = parseFloat(o.commission_rate) || 0;

            let finalP = sp > 0 ? sp : p;
            if (c > 0) {
                finalP = finalP + (finalP * (c / 100));
            }
            
            return { "@type": "Offer", "url": o.affiliate_url, "priceCurrency": o.currency || "USD", "price": finalP.toFixed(2), "availability": "https://schema.org/InStock", "seller": { "@type": "Organization", "name": o.store_name } };
        })
    };
    if (product.rating && product.reviews_count > 0) jsonLd.aggregateRating = { "@type": "AggregateRating", "ratingValue": product.rating, "reviewCount": product.reviews_count };
    const script = document.createElement('script'); script.type = 'application/ld+json'; script.text = JSON.stringify(jsonLd); document.head.appendChild(script);
});
