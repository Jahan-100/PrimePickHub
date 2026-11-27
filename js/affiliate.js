// js/affiliate.js — v8
function isValidRedirectURL(url) {
    if (typeof url !== 'string') return false;
    try { const p = new URL(url, window.location.origin); return p.protocol === 'https:' || p.protocol === 'http:'; } catch { return false; }
}

function addTrackingParam(url, store, subId) {
    try {
        const u = new URL(url, window.location.origin);
        const storeKey = String(store || '').toLowerCase();
        if (storeKey.includes('amazon')) u.searchParams.set('ascsubtag', subId);
        else if (storeKey.includes('aliexpress')) u.searchParams.set('aff_sub', subId);
        else u.searchParams.set('subid', subId);
        return u.toString();
    } catch (err) { return url; }
}

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.js-affiliate-link, .btn-check-price');
        if (!btn) return;
        const href = btn.getAttribute('href') || '';
        const isExternal = btn.hasAttribute('data-url') || /^https?:\/\//i.test(href);
        if (!isExternal && !btn.classList.contains('js-affiliate-link')) return;

        const productId = btn.getAttribute('data-product-id');
        const store = btn.getAttribute('data-store') || 'External Store';
        const originalUrl = btn.getAttribute('data-url') || href;

        if (!originalUrl || originalUrl === '#' || !isValidRedirectURL(originalUrl)) {
            e.preventDefault(); btn.setAttribute('aria-disabled', 'true'); return;
        }

        const pageSource = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '') || 'home';
        const subId = `primepickhub-${pageSource}`;

        try { if (typeof API !== 'undefined' && API.recordClick) API.recordClick(productId, store, subId); } catch (err) { console.warn('recordClick failed', err); }

        const finalUrl = addTrackingParam(originalUrl, store, subId);

        if (btn.tagName.toLowerCase() === 'a') {
            btn.setAttribute('href', finalUrl);
            if (!btn.getAttribute('target')) btn.setAttribute('target', '_blank');
            btn.setAttribute('rel', 'noopener sponsored');
        } else {
            e.preventDefault(); window.open(finalUrl, '_blank', 'noopener');
        }
    });
});
