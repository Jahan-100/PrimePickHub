// js/api.js — v10
const API = {
    async signIn(email, password) {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error; return data;
    },
    async signOut() { await window.supabaseClient.auth.signOut(); },
    async getCurrentUser() {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return null;
        const { data: profile } = await window.supabaseClient.from('profiles').select('role').eq('id', user.id).maybeSingle();
        return { user, role: profile?.role || 'user' };
    },
    async getHomepageProducts() {
        if (!window.supabaseClient) return { featured: [], trending: [], latest: [] };
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('id, title, slug, image_url, rating, reviews_count, is_featured, is_trending, is_special_deal, category_slug, badge, sale_end_date, sale_end_date_2, event_name, event_name_2, is_available, affiliate_offers(id, store_name, affiliate_url, price, sale_price, commission_rate, currency, product_color, color_name, variation_name)')
            .order('created_at', { ascending: false }).limit(100);
        if (error || !data) return { featured: [], trending: [], latest: [] };
        return { featured: data.filter(p => p.is_featured), trending: data.filter(p => p.is_trending), latest: data.slice(0, 100) };
    },
    async getProductBySlug(slug) {
        if (!window.supabaseClient) return null;
        const { data, error } = await window.supabaseClient.from('products').select('*, affiliate_offers(*)').eq('slug', slug).single();
        return error ? null : data;
    },
    async searchProducts({ query = '', category = '' }) {
        try {
            if (!window.supabaseClient) return [];
            let req = window.supabaseClient.from('products')
                .select('id, title, slug, image_url, rating, reviews_count, category_slug, is_available, badge, sale_end_date, sale_end_date_2, affiliate_offers(id, store_name, affiliate_url, price, sale_price, commission_rate, currency, product_color, color_name, variation_name)')
                .limit(500);
            if (query) req = req.ilike('title', `%${query}%`);
            const { data, error } = await req;
            if (error) return [];
            let results = Array.isArray(data) ? data : [];
            if (category) {
                const cats = Array.isArray(category) ? category : [category];
                const lowerCats = cats.map(c => c && typeof c === 'string' ? c.trim().toLowerCase() : '').filter(Boolean);
                results = results.filter(p => p && p.category_slug && typeof p.category_slug === 'string' && lowerCats.includes(p.category_slug.trim().toLowerCase()));
            }
            return results;
        } catch (e) { console.error("Search API Error:", e); return []; }
    },
    async addProduct(data) {
        const { data: result, error } = await window.supabaseClient.from('products').insert([data]).select();
        if (error) throw error; return result;
    },
    async getAdminStats() {
        if (!window.supabaseClient) return { totalProducts: 0, totalClicks: 0 };
        const { count: totalProducts } = await window.supabaseClient.from('products').select('*', { count: 'exact', head: true });
        const { count: totalClicks } = await window.supabaseClient.from('clicks').select('*', { count: 'exact', head: true });
        return { totalProducts: totalProducts || 0, totalClicks: totalClicks || 0 };
    },
    recordClick(productId, store, subId) {
        if (!window.supabaseClient || !productId) return;
        function readCookie(name) {
            if (typeof getCookie === 'function') return getCookie(name);
            const m = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]+)'));
            return m ? decodeURIComponent(m[2]) : null;
        }
        let geo = { country: 'Unknown', city: 'Unknown' };
        try { const s = localStorage.getItem('geo_data'); if (s) geo = JSON.parse(s); } catch (e) {}
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const clickData = {
            product_id: productId,
            store: String(store || '').slice(0, 50),
            sub_id: String(subId || '').slice(0, 100),
            referrer: String(document.referrer || '').slice(0, 200),
            country: geo.country || 'Unknown',
            city: geo.city || 'Unknown',
            device_type: isMobile ? 'Mobile' : 'Desktop',
            visitor_id: readCookie('visitor_id') || readCookie('device_id') || 'Unknown'
        };
        try {
            window.supabaseClient.from('clicks').insert([clickData])
                .then(({ error }) => { if (error) console.warn('Click track warning:', error.message); })
                .catch(() => {});
        } catch (e) {
            try {
                fetch(`${CONFIG.supabaseUrl}/rest/v1/clicks`, {
                    method: 'POST',
                    headers: { 'apikey': CONFIG.supabaseKey, 'Authorization': `Bearer ${CONFIG.supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                    body: JSON.stringify(clickData), keepalive: true
                }).catch(() => {});
            } catch (e2) {}
        }
    },
    async getCategories() {
        const masterCats = (typeof CONFIG !== 'undefined' && CONFIG.categories) ? CONFIG.categories : [];
        let customCats = [];
        try {
            if (window.supabaseClient) {
                const { data, error } = await window.supabaseClient.from('site_settings').select('custom_categories').eq('id', 1).maybeSingle();
                if (!error && data && data.custom_categories) {
                    customCats = typeof data.custom_categories === 'string' ? JSON.parse(data.custom_categories) : data.custom_categories;
                    try { localStorage.setItem('cached_categories', JSON.stringify(customCats)); } catch(e) {}
                } else {
                    try { customCats = JSON.parse(localStorage.getItem('cached_categories') || '[]'); } catch(e) {}
                }
            }
        } catch (e) {
            try { customCats = JSON.parse(localStorage.getItem('cached_categories') || '[]'); } catch(e) {}
        }
        let merged = [...masterCats];
        if (Array.isArray(customCats)) {
            customCats.forEach(c => {
                if (!c || !c.slug || typeof c.slug !== 'string') return;
                const idx = merged.findIndex(m => m && m.slug && typeof m.slug === 'string' && m.slug.toLowerCase() === c.slug.toLowerCase());
                if (idx > -1) merged[idx] = c; else merged.push(c);
            });
        }
        return merged.filter(c => c.name !== '__DELETED__');
    }
};
window.API = API;
