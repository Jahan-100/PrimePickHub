const API = {
    async signIn(email, password) {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
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
        const { data, error } = await window.supabaseClient.from('products').select('*, affiliate_offers(*)').order('created_at', { ascending: false }).limit(100);
        if (error || !data) return { featured: [], trending: [], latest: [] };
        return { featured: data.filter(p => p.is_featured), trending: data.filter(p => p.is_trending), latest: data.slice(0, 100) };
    },
    async getProductBySlug(slug) {
        if (!window.supabaseClient) return null;
        const { data, error } = await window.supabaseClient.from('products').select('*, affiliate_offers(*)').eq('slug', slug).single();
        return error ? null : data;
    },
    async searchProducts({ query = '', category = '' }) {
        if (!window.supabaseClient) return [];
        let req = window.supabaseClient.from('products').select('*, affiliate_offers(*)').limit(100);
        
        if (category) {
            // ⭐ FIX: If category is an array, use .in() operator, otherwise .eq() ⭐
            if (Array.isArray(category)) {
                req = req.in('category_slug', category);
            } else {
                req = req.eq('category_slug', category);
            }
        }
        
        if (query) req = req.ilike('title', `%${query}%`);
        const { data, error } = await req;
        return error ? [] : (data || []);
    },
    async addProduct(data) {
        const { data: result, error } = await window.supabaseClient.from('products').insert([data]).select();
        if (error) throw error;
        return result;
    },
    async getAdminStats() {
        if (!window.supabaseClient) return { totalProducts: 0, totalClicks: 0 };
        const { count: totalProducts } = await window.supabaseClient.from('products').select('*', { count: 'exact', head: true });
        const { count: totalClicks } = await window.supabaseClient.from('clicks').select('*', { count: 'exact', head: true });
        return { totalProducts: totalProducts || 0, totalClicks: totalClicks || 0 };
    },
    recordClick(productId, store, subId) {
        if (!window.supabaseClient || !productId) return;
        
        let geo = { country: 'Unknown', city: 'Unknown' };
        try {
            const storedGeo = localStorage.getItem('geo_data');
            if (storedGeo) geo = JSON.parse(storedGeo);
        } catch (e) {}

        window.supabaseClient.from('clicks').insert([{
            product_id: productId,
            store: String(store || '').slice(0, 50),
            sub_id: String(subId || '').slice(0, 100),
            referrer: String(document.referrer || '').slice(0, 200),
            country: geo.country || 'Unknown',
            city: geo.city || 'Unknown'
        }]).then(({ error }) => { if (error) console.warn('Track error:', error); }).catch(() => {});
    },
    // ⭐ CENTRALIZED CATEGORIES FETCHER ⭐
    async getCategories() {
        if (!window.supabaseClient) return (typeof CONFIG !== 'undefined' && CONFIG.categories) ? CONFIG.categories : [];
        
        const { data, error } = await window.supabaseClient.from('site_settings').select('custom_categories').eq('id', 1).maybeSingle();
        
        let customCats = [];
        if (!error && data && data.custom_categories) {
            customCats = typeof data.custom_categories === 'string' ? JSON.parse(data.custom_categories) : data.custom_categories;
            try { localStorage.setItem('cached_categories', JSON.stringify(customCats)); } catch(e) {}
        } else {
            try { customCats = JSON.parse(localStorage.getItem('cached_categories') || '[]'); } catch(e) {}
        }

        const masterCats = (typeof CONFIG !== 'undefined' && CONFIG.categories) ? CONFIG.categories : [];
        
        // Merge (custom overrides master)
        let merged = [...masterCats];
        customCats.forEach(c => {
            const idx = merged.findIndex(m => m.slug === c.slug);
            if (idx > -1) merged[idx] = c; 
            else merged.push(c); 
        });

        return merged;
    }
};
