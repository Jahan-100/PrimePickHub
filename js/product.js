/**
 * Product Detail Page with Customer Reviews & Image Compression
 */

function getVideoHtml(url) {
    if (!url || typeof url !== 'string') return '';
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return `<video controls style="width:100%;border-radius:12px;background:#000;"><source src="${escapeHTML(url)}"></video>`;
    let embedUrl = url;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;"><iframe src="${escapeHTML(embedUrl)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div>`;
}

const currencySymbols = { USD: '$', PKR: 'Rs. ', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ', SAR: 'SAR ', CAD: 'C$', AUD: 'A$', CNY: '¥', JPY: '¥', TRY: '₺', BDT: '৳', MYR: 'RM ', IDR: 'Rp ', QAR: 'QAR ', KWD: 'KWD ', BHD: 'BHD ', OMR: 'OMR ', ZAR: 'R ', BRL: 'R$', MXN: 'MX$', RUB: '₽', KRW: '₩', SGD: 'S$', HKD: 'HK$', NZD: 'NZ$', CHF: 'CHF ', SEK: 'kr ', NOK: 'kr ' };

// ⭐ IMAGE COMPRESSION FUNCTION (Canvas API) ⭐
async function compressImage(file, maxWidth = 1000, maxHeight = 1000, quality = 0.75) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                } else {
                    if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' })), 'image/jpeg', quality);
            };
        };
    });
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

    // ... (Canonical, Meta, Offers setup same as before) ...
    const canonical = document.getElementById('canonicalLink'); if (canonical) canonical.href = window.location.href.split('?')[0];
    document.title = `${product.title} - Best Price | PrimePickHub`;

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
                if (!uniqueColors.find(c => c.value === val)) { uniqueColors.push({ value: val, hdValue: getHighQualityImage(val, 400), name: colorNames[idx] || val }); }
            });
        }
    });
    
    let activeColor = uniqueColors.length > 0 ? uniqueColors[0].value : null;
    let activeColorName = uniqueColors.length > 0 ? uniqueColors[0].name : '';
    let activeOfferIndex = 0;
    let activeSize = null;
    if (activeColor) { const idx = allVariations.findIndex(v => v.product_color && v.product_color.includes(activeColor)); if (idx !== -1) activeOfferIndex = idx; }
    const initialOffersForColor = activeColor ? allVariations.filter(v => v.product_color && v.product_color.includes(activeColor)) : allVariations;
    let initialAvailableSizes = [];
    initialOffersForColor.forEach(o => { if (o.variation_name) { o.variation_name.split(',').map(s => s.trim()).filter(Boolean).forEach(s => { if (!initialAvailableSizes.includes(s)) initialAvailableSizes.push(s); }); } });
    if (initialAvailableSizes.length > 0) activeSize = initialAvailableSizes[0];
    let activeOffer = allVariations[activeOfferIndex];
    const baseCurrency = (mainOffer.currency || 'USD').toUpperCase();

    // ... (Render UI, Main Image, etc. same as before) ...
    // [Assuming the HTML layout is injected here as per previous code]

    // ⭐ 3. FETCH AND RENDER CUSTOMER REVIEWS ⭐
    async function loadCustomerReviews() {
        const { data: reviews } = await window.supabaseClient.from('product_reviews').select('*').eq('product_id', product.id).eq('status', 'approved').order('created_at', { ascending: false });
        const revContainer = document.getElementById('customerReviewsList');
        if (!revContainer) return;
        
        if (!reviews || reviews.length === 0) {
            revContainer.innerHTML = '<p style="color:#64748B; font-size:0.9rem;">No reviews yet. Be the first to review this product!</p>';
            return;
        }

        revContainer.innerHTML = reviews.map(r => `
            <div style="border-bottom: 1px solid #E2E8F0; padding: 15px 0;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <strong style="color:#1E1B4B; font-size:1rem;">${escapeHTML(r.customer_name)}</strong>
                    <span style="color:#F59E0B; font-size:0.9rem;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
                </div>
                <p style="color:#475569; font-size:0.9rem; line-height:1.5; margin-bottom:10px;">${escapeHTML(r.review_text)}</p>
                ${r.images && r.images.length > 0 ? `
                    <div style="display:flex; gap:10px; overflow-x:auto;">
                        ${r.images.map(img => `<img src="${escapeHTML(img)}" style="width:70px; height:70px; object-fit:cover; border-radius:6px; cursor:pointer;" onclick="window.open('${escapeHTML(img)}', '_blank')">`).join('')}
                    </div>
                ` : ''}
                <p style="font-size:0.75rem; color:#94A3B8; margin-top:8px;">${new Date(r.created_at).toLocaleDateString()}</p>
            </div>
        `).join('');
    }

    // Inject Review Section HTML into the page (assuming you have a div for it)
    // Add this HTML at the bottom of the product layout
    const reviewSectionHtml = `
        <div style="width: 100%; margin-top: 30px; background: #fff; padding: 30px; border-radius: 12px; border: 1px solid #E2E8F0;">
            <h2 style="font-family:'Poppins',sans-serif; font-size:1.6rem; margin-bottom:20px; border-bottom:2px solid #FF5A3C; padding-bottom:10px; display:inline-block;">Customer Reviews & Photos</h2>
            
            <div id="customerReviewsList" style="margin-bottom: 30px;">
                <p style="color:#64748B;">Loading reviews...</p>
            </div>

            <!-- Review Form -->
            <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; border: 1px dashed #CBD5E1;">
                <h3 style="font-size: 1.1rem; margin-bottom: 15px; color: #1E1B4B;">Write a Review</h3>
                <form id="reviewForm">
                    <input type="hidden" id="rvProductId" value="${product.id}">
                    <div style="display: flex; gap: 15px; margin-bottom: 10px; flex-wrap: wrap;">
                        <input type="text" id="rvName" placeholder="Your Name *" required style="flex:1; padding:10px; border:1px solid #CBD5E1; border-radius:6px;">
                        <select id="rvRating" required style="padding:10px; border:1px solid #CBD5E1; border-radius:6px;">
                            <option value="5">★★★★★ (Excellent)</option>
                            <option value="4">★★★★☆ (Good)</option>
                            <option value="3">★★★☆☆ (Average)</option>
                            <option value="2">★★☆☆☆ (Poor)</option>
                            <option value="1">★☆☆☆☆ (Terrible)</option>
                        </select>
                    </div>
                    <textarea id="rvText" placeholder="What did you like or dislike? *" required rows="3" style="width:100%; padding:10px; border:1px solid #CBD5E1; border-radius:6px; margin-bottom:10px;"></textarea>
                    <div style="margin-bottom: 15px;">
                        <label style="font-size:0.85rem; font-weight:bold; color:#475569; display:block; margin-bottom:5px;">Add Photos (Optional - Max 3)</label>
                        <input type="file" id="rvImages" accept="image/*" multiple style="font-size:0.85rem;">
                    </div>
                    <button type="submit" id="rvSubmitBtn" style="background: #10B981; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;">Submit Review</button>
                    <p id="rvMsg" style="margin-top:10px; font-size:0.85rem; font-weight:bold;"></p>
                </form>
            </div>
        </div>
    `;
    
    // Append Review section after the main product layout
    container.insertAdjacentHTML('beforeend', reviewSectionHtml);
    loadCustomerReviews();

    // Handle Review Submission
    document.getElementById('reviewForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('rvSubmitBtn'); const msg = document.getElementById('rvMsg');
        const name = document.getElementById('rvName').value.trim();
        const text = document.getElementById('rvText').value.trim();
        const rating = parseInt(document.getElementById('rvRating').value);
        const fileInput = document.getElementById('rvImages');
        
        if (!name || !text) return;
        btn.innerText = "Submitting..."; btn.disabled = true; msg.innerText = "";

        try {
            let uploadedUrls = [];
            if (fileInput.files.length > 0) {
                const filesToUpload = Array.from(fileInput.files).slice(0, 3); // Max 3
                for (const file of filesToUpload) {
                    const compressedFile = await compressImage(file);
                    const fileName = `rev-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                    const { data, error } = await window.supabaseClient.storage.from('customer-review-photos').upload(fileName, compressedFile);
                    if (!error) {
                        const { data: urlData } = window.supabaseClient.storage.from('customer-review-photos').getPublicUrl(fileName);
                        uploadedUrls.push(urlData.publicUrl);
                    }
                }
            }

            const { error: dbError } = await window.supabaseClient.from('product_reviews').insert([{
                product_id: product.id,
                customer_name: name,
                rating: rating,
                review_text: text,
                images: uploadedUrls,
                status: 'pending' // Pending by default
            }]);

            if (dbError) throw dbError;
            
            msg.style.color = "#16a34a"; msg.innerText = "Thank you! Your review is pending approval.";
            document.getElementById('reviewForm').reset();
        } catch (err) {
            msg.style.color = "#DC2626"; msg.innerText = "Error: " + err.message;
        } finally {
            btn.innerText = "Submit Review"; btn.disabled = false;
        }
    });
});
