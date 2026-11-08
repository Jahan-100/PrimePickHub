/**
 * PrimePickHub — Common Utility Functions
 * Load this file BEFORE app.js, product.js, category.js, search.js
 */

// ✅ XSS-safe text renderer
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ✅ Smart Image Optimizer (Amazon, AliExpress, Daraz, eBay, Shopify)
function getHighQualityImage(url, size = 400) {
    if (!url || typeof url !== 'string') return url;
    let cleanUrl = url.trim();

    if (cleanUrl.includes('aliexpress') || cleanUrl.includes('daraz') || cleanUrl.includes('alicdn') || cleanUrl.includes('alibaba')) {
        const qIdx = cleanUrl.indexOf('?');
        if (qIdx > -1) cleanUrl = cleanUrl.slice(0, qIdx);
        cleanUrl = cleanUrl.replace(/(\.(?:jpg|jpeg|png|webp))(?:_[^.?]*)?(?:\.(?:jpg|jpeg|png|webp|avif))?$/i, `$1_${size}x${size}q80.jpg`);
    } else if (cleanUrl.includes('amazon') || cleanUrl.includes('media-amazon')) {
        const qIdx = cleanUrl.indexOf('?');
        if (qIdx > -1) cleanUrl = cleanUrl.slice(0, qIdx);
        if (/\._[A-Z0-9_,]+_\.(jpg|jpeg|png|webp)/i.test(cleanUrl)) {
            cleanUrl = cleanUrl.replace(/\._[A-Z0-9_,]+_\.(jpg|jpeg|png|webp)/i, `._AC_SL${size}_.$1`);
        } else {
            cleanUrl = cleanUrl.replace(/(\.(?:jpg|jpeg|png|webp))$/i, `._AC_SL${size}_$1`);
        }
    } else if (cleanUrl.includes('ebayimg.com')) {
        cleanUrl = cleanUrl.replace(/\/s-l\d+\.(jpg|jpeg|png|webp)/i, `/s-l${size}.$1`);
    } else if (cleanUrl.includes('shopify') || cleanUrl.includes('govee') || cleanUrl.includes('allegra-k.com') || cleanUrl.includes('cdn.shopify')) {
        const qIdx = cleanUrl.indexOf('?');
        if (qIdx > -1) cleanUrl = cleanUrl.slice(0, qIdx);
        cleanUrl = cleanUrl.replace(/_(small|medium|large|\d+x\d*|\d*x\d+)(\.(jpg|jpeg|png|webp))/i, '$2');
        cleanUrl = cleanUrl + `?width=${size}`;
    } else {
        cleanUrl = cleanUrl.replace(/[_-]\d+x\d+(?=\.(jpg|jpeg|png|webp|avif))/i, '');
        cleanUrl = cleanUrl.replace(/_\d+x(?=\.(jpg|jpeg|png|webp|avif))/i, '');
    }
    return cleanUrl;
}

// ✅ URL Validators (used in app.js, product.js, affiliate.js)
function isValidExternalURL(url) {
    if (typeof url !== 'string') return false;
    try {
        const p = new URL(url, window.location.origin);
        return p.protocol === 'https:' || p.protocol === 'http:';
    } catch { return false; }
}

function isValidURL(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const p = new URL(url, window.location.origin);
        return p.protocol === 'http:' || p.protocol === 'https:';
    } catch { return false; }
}
