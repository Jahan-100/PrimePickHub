/**
 * PrimePickHub Configuration — v8
 * ⚠️ LOAD ORDER: supabase-js CDN → utils.js → config.js → api.js → affiliate.js
 */
const CONFIG = {
    supabaseUrl: 'https://smxjiwywepeaybhekrck.supabase.co',
    supabaseKey: 'sb_publishable_1DU8r5ZaZmPt77Olw5hQIg_xoGXioZt',

    defaultAffiliateTag: 'primepickhub-20',

    networks: {
        amazon:     { name: 'Amazon',     brandColor: '#FF9900', textColor: '#FFFFFF' },
        aliexpress: { name: 'AliExpress', brandColor: '#FF4747', textColor: '#FFFFFF' },
        daraz:      { name: 'Daraz',      brandColor: '#F57224', textColor: '#FFFFFF' },
        ebay:       { name: 'eBay',       brandColor: '#E53238', textColor: '#FFFFFF' },
        walmart:    { name: 'Walmart',    brandColor: '#0071CE', textColor: '#FFFFFF' },
        "allegra k":{ name: 'Allegra K', brandColor: '#2563eb', textColor: '#FFFFFF' },
        "hacoo":    { name: 'Hacoo',     brandColor: '#2563eb', textColor: '#FFFFFF' },
        "govee":    { name: 'Govee',     brandColor: '#2563eb', textColor: '#FFFFFF' },
        "chicme":   { name: 'ChicMe',    brandColor: '#2563eb', textColor: '#FFFFFF' },
        "stylewe":  { name: 'Stylewe',   brandColor: '#2563eb', textColor: '#FFFFFF' },
        "lenovo":   { name: 'Lenovo',    brandColor: '#E2231A', textColor: '#FFFFFF' }
    },

    categories: [
        { slug: 'all', name: 'For you', icon: '❤️', parent: null },
        { slug: 'electronics', name: 'Electronics', icon: '📱', parent: null },
        { slug: 'fashion', name: 'Fashion', icon: '👗', parent: null },
        { slug: 'home-kitchen', name: 'Home & Kitchen', icon: '🛋️', parent: null },
        { slug: 'beauty', name: 'Beauty', icon: '💄', parent: null },
        { slug: 'sports', name: 'Sports', icon: '🏋️', parent: null },
        { slug: 'toys', name: 'Toys', icon: '🧸', parent: null },
        { slug: 'automotive', name: 'Automotive', icon: '🚗', parent: null },
        { slug: 'accessories', name: 'Accessories', icon: '💍', parent: null },
        { slug: 'womens-fashion', name: 'Women\'s Fashion', parent: 'fashion' },
        { slug: 'mens-fashion', name: 'Men\'s Fashion', parent: 'fashion' },
        { slug: 'shoes', name: 'Shoes', parent: 'fashion' },
        { slug: 'bags-luggage', name: 'Bags & Luggage', parent: 'fashion' },
        { slug: 'scarves', name: 'Scarves', parent: 'accessories' },
        { slug: 'jewelry-watches', name: 'Jewelry & Watches', parent: 'accessories' },
        { slug: 'sunglasses', name: 'Sunglasses', parent: 'accessories' },
        { slug: 'belts', name: 'Belts', parent: 'accessories' },
        { slug: 'womens-shoes', name: 'Women\'s Shoes', parent: 'shoes' },
        { slug: 'mens-shoes', name: 'Men\'s Shoes', parent: 'shoes' },
        { slug: 'kids-shoes', name: 'Kids Shoes', parent: 'shoes' }
    ]
};

// ⭐ Append Amazon tag if missing ⭐
function appendAffiliateTag(url) {
    if (!url || typeof url !== 'string') return url;
    if (!url.includes('amazon.')) return url;
    try {
        const u = new URL(url);
        if (!u.searchParams.has('tag')) u.searchParams.set('tag', CONFIG.defaultAffiliateTag);
        return u.toString();
    } catch { return url; }
}
window.appendAffiliateTag = appendAffiliateTag;

// ⭐ SAFE INITIALIZATION ⭐
if (typeof supabase !== 'undefined' && CONFIG.supabaseUrl && CONFIG.supabaseKey) {
    try {
        window.supabaseClient = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
        console.log("✅ Supabase Client Initialized.");
    } catch (err) {
        console.error("❌ Supabase init failed:", err);
    }
} else {
    console.error("❌ Supabase SDK not loaded. Ensure CDN script comes BEFORE config.js with 'defer'.");
}

window.CONFIG = CONFIG;
