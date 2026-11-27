// js/utils.js — SHARED HELPERS (works on all pages)
// NOTE: If your existing utils.js has escapeHTML/getHighQualityImage/isValidURL,
//       keep those AND paste the cookie + URL helpers below.

/* ---------- Cookie Helpers (used by api.js, affiliate.js) ---------- */
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

/* ---------- Safe URL check ---------- */
function isValidURL(str) {
    if (!str || typeof str !== 'string') return false;
    try {
        const u = new URL(str, window.location.origin);
        return u.protocol === 'https:' || u.protocol === 'http:';
    } catch { return false; }
}

/* ---------- High-quality image (WebP/AVIF resize via wsrv.nl) ---------- */
function getHighQualityImage(url, width) {
    if (!url || typeof url !== 'string') return url;
    if (!/^https?:\/\//i.test(url)) return url;
    // Use wsrv.nl free CDN for resizing — speeds up page load massively
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width || 300}&output=webp&q=80`;
}

/* ---------- XSS-safe HTML escape ---------- */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ---------- Ensure visitor cookie exists on every page ---------- */
(function ensureVisitorCookie() {
    try {
        if (!getCookie('visitor_id')) {
            const id = (crypto.randomUUID && crypto.randomUUID()) ||
                ('v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
            setCookie('visitor_id', id, 365);
        }
    } catch (e) { /* ignore */ }
})();

/* ---------- Cache geo data once per session ---------- */
(function cacheGeoData() {
    try {
        if (localStorage.getItem('geo_data')) return;
        fetch('/api/geo')
            .then(r => r.json())
            .then(d => localStorage.setItem('geo_data', JSON.stringify(d)))
            .catch(() => {});
    } catch (e) { /* ignore */ }
})();
// js/utils.js — SHARED HELPERS
// ⚠️ MERGE THESE INTO YOUR EXISTING utils.js (don't replace if you have others)

/* ---------- Cookie Helpers ---------- */
window.setCookie = window.setCookie || function(name, value, days) {
    let expires = "";
    if (days) { const date = new Date(); date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000)); expires = "; expires=" + date.toUTCString(); }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
};

window.getCookie = window.getCookie || function(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};

/* ---------- URL Validation ---------- */
window.isValidURL = window.isValidURL || function(str) {
    if (!str || typeof str !== 'string') return false;
    try { const u = new URL(str, window.location.origin); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; }
};

/* ---------- Image Resize via CDN (speed boost) ---------- */
window.getHighQualityImage = window.getHighQualityImage || function(url, width) {
    if (!url || typeof url !== 'string') return url;
    if (!/^https?:\/\//i.test(url)) return url;
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width || 300}&output=webp&q=80`;
};

/* ---------- XSS Escape ---------- */
window.escapeHTML = window.escapeHTML || function(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

/* ---------- Ensure visitor cookie + cache geo ---------- */
(function ensureVisitorCookie() {
    try {
        if (!getCookie('visitor_id')) {
            const id = (crypto.randomUUID && crypto.randomUUID()) || ('v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
            setCookie('visitor_id', id, 365);
        }
    } catch (e) {}
})();

(function cacheGeoData() {
    try {
        if (localStorage.getItem('geo_data')) return;
        fetch('/api/geo').then(r => r.json()).then(d => localStorage.setItem('geo_data', JSON.stringify(d))).catch(() => {});
    } catch (e) {}
})();
