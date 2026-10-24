/**
 * PrimePickHub Affiliate Link Redirect Handler
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

        if (!originalUrl || originalUrl === '#' || !isValidRedirectURL(originalUrl)) {
            console.warn('Affiliate link blocked: unsafe URL');
            e.preventDefault(); 
            btn.setAttribute('aria-disabled', 'true');
            return;
        }

        const pageSource = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '') || 'home';
        const subId = `primepickhub-${pageSource}`;

        if (typeof API !== 'undefined' && API.recordClick) {
            API.recordClick(productId, store, subId);
        }

        try {
            const u = new URL(originalUrl, window.location.origin);
            u.searchParams.set('subid', subId);
            btn.setAttribute('href', u.toString());
            
            if (btn.tagName.toLowerCase() === 'a') {
                if (!btn.getAttribute('target')) btn.setAttribute('target', '_blank');
                btn.setAttribute('rel', 'noopener noreferrer sponsored');
            } else {
                e.preventDefault();
                window.open(u.toString(), '_blank', 'noopener,noreferrer');
            }
        } catch (err) {
            console.warn('URL build failed:', err);
        }
    });
});
