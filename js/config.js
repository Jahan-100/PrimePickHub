/**
 * PrimePickHub Configuration
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
        walmart:    { name: 'Walmart',    brandColor: '#0071CE', textColor: '#FFFFFF' }
    },

    categories: [
        { slug: 'all', name: 'For you', icon: '❤️' },
        { slug: 'electronics', name: 'Electronics', icon: '📱' },
        { slug: 'mens-fashion', name: 'Men\'s Fashion', icon: '👔' },
        { slug: 'womens-fashion', name: 'Women\'s Fashion', icon: '👗' },
        { slug: 'accessories', name: 'Accessories', icon: '💍' },
        { slug: 'shoes', name: 'Shoes', icon: '👟' },
        { slug: 'bags-luggage', name: 'Bags & Luggage', icon: '👜' },
        { slug: 'home-kitchen', name: 'Home & Kitchen', icon: '🛋️' },
        { slug: 'beauty-personal-care', name: 'Beauty & Personal Care', icon: '💄' },
        { slug: 'health-household', name: 'Health & Household', icon: '💊' },
        { slug: 'sports-outdoors', name: 'Sports & Outdoors', icon: '🏋️' },
        { slug: 'toys-games', name: 'Toys & Games', icon: '🧸' },
        { slug: 'automotive', name: 'Automotive', icon: '🚗' },
        { slug: 'books-media', name: 'Books & Media', icon: '📚' },
        { slug: 'pets-supplies', name: 'Pet Supplies', icon: '🐾' },
        { slug: 'baby-kids', name: 'Baby & Kids', icon: '👶' },
        { slug: 'office-products', name: 'Office Products', icon: '💼' },
        { slug: 'garden-outdoor', name: 'Garden & Outdoor', icon: '🌻' },
        { slug: 'tools-home-improvement', name: 'Tools & Home Improvement', icon: '🔧' },
        { slug: 'grocery', name: 'Grocery', icon: '🍎' },
        { slug: 'jewelry-watches', name: 'Jewelry & Watches', icon: '⌚' },
        { slug: 'watches', name: 'Watches', icon: '⌚' }
    ]
};

// ⭐ SAFE INITIALIZATION ⭐
if (typeof supabase !== 'undefined' && CONFIG.supabaseUrl) {
    window.supabaseClient = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    console.log("✅ Supabase Client Initialized Successfully.");
} else {
    console.error("❌ Supabase SDK not found. Check if script is loaded before config.js");
}
