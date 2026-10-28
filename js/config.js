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

    // ⭐ Duniya Bhar Ki Categories (Master List) ⭐
    categories: [
        { slug: 'all', name: 'For you', icon: '❤️' },
        { slug: 'electronics', name: 'Electronics', icon: '📱' },
        { slug: 'fashion', name: 'Fashion', icon: '👗' },
        { slug: 'home-kitchen', name: 'Home & Kitchen', icon: '🛋️' },
        { slug: 'beauty', name: 'Beauty', icon: '💄' },
        { slug: 'sports', name: 'Sports', icon: '🏋️' },
        { slug: 'toys', name: 'Toys', icon: '🧸' },
        { slug: 'automotive', name: 'Automotive', icon: '🚗' },
        { slug: 'books', name: 'Books', icon: '📚' },
        { slug: 'health', name: 'Health & Household', icon: '💊' },
        { slug: 'pets', name: 'Pet Supplies', icon: '🐾' },
        { slug: 'baby', name: 'Baby', icon: '👶' },
        { slug: 'office', name: 'Office Products', icon: '💼' },
        { slug: 'garden', name: 'Garden & Outdoor', icon: '🌻' },
        { slug: 'tools', name: 'Tools & Home Improvement', icon: '🔧' },
        { slug: 'grocery', name: 'Grocery', icon: '🍎' },
        { slug: 'jewelry', name: 'Jewelry', icon: '💍' },
        { slug: 'shoes', name: 'Shoes', icon: '👟' },
        { slug: 'bags', name: 'Bags & Luggage', icon: '👜' },
        { slug: 'watches', name: 'Watches', icon: '⌚' }
    ]
};

if (typeof supabase !== 'undefined' && CONFIG.supabaseUrl) {
    window.supabaseClient = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
}
