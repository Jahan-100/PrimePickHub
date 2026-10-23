/**
 * PrimePickHub Configuration
 * ⚠️ Replace supabaseUrl and supabaseKey with YOUR project's values
 * Get them from: Supabase Dashboard → Settings → API
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
    }
};

if (typeof supabase !== 'undefined' && CONFIG.supabaseUrl) {
    window.supabaseClient = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
}