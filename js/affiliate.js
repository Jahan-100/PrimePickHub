/**
 * PrimePickHub Affiliate Link Redirect Handler
 * Native Anchor Tag Redirect (No Popup Blockers)
 */

function isValidRedirectURL(url) {
    if (typeof url !== 'string') return false;
    try {
        const p = new URL(url, window.location.origin);
        return p.protocol === 'https:' || p.protocol === 'http:';
    } catch { return false; }
}

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.js-affiliate-link, .btn-check-price');
        if (!btn) return;

        const productId = btn.getAttribute('data-product-id');
        const store = btn.getAttribute('data-store') || 'External Store';
        const originalUrl = btn.getAttribute('data-url') || btn.getAttribute('href');

        // Agar URL galat ya khali hai, toh click roak dein
        if (!originalUrl || originalUrl === '#' || !isValidRedirectURL(originalUrl)) {
            console.warn('Affiliate link blocked: unsafe URL');
            e.preventDefault(); 
            btn.setAttribute('aria-disabled', 'true');
            return;
        }

        const pageSource = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '') || 'home';
        const subId = `primepickhub-${pageSource}`;

        // 1. Track click (fire-and-forget, browser ko nahi roktay)
        if (typeof API !== 'undefined' && API.recordClick) {
            API.recordClick(productId, store, subId);
        }

        // 2. Append subid to URL
        try {
            const u = new URL(originalUrl, window.location.origin);
            u.searchParams.set('subid', subId);
            const finalUrl = u.toString();

            // 3. Update the anchor tag's href
            btn.setAttribute('href', finalUrl);
            
            // 4. Agar button <a> tag hai, toh browser automatically new tab mein khol dega (target="_blank")
            // Agar kisi wajah se target missing hai, toh yahan set kar dein
            if (btn.tagName.toLowerCase() === 'a') {
                if (!btn.getAttribute('target')) {
                    btn.setAttribute('target', '_blank');
                }
                btn.setAttribute('rel', 'noopener noreferrer sponsored');
            } else {
                // Agar button tag hai (fallback), toh window.open use karein lekin current tab redirect NA karein
                e.preventDefault();
                window.open(finalUrl, '_blank', 'noopener,noreferrer');
            }
            
            // ⭐ Hum e.preventDefault() nahi laga rahe (anchor tag ke liye)
            // Is se browser default action chalega aur naya tab khulega, current tab safe rahega.

        } catch (err) {
            console.warn('URL build failed:', err);
        }
    });
});
