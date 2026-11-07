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
    // ⭐ UPDATED: Case-Insensitive Category Search ⭐
    async searchProducts({ query = '', category = '' }) {
        if (!window.supabaseClient) return [];
        let req = window.supabaseClient.from('products').select('*, affiliate_offers(*)').limit(500);
        
        if (query) req = req.ilike('title', `%${query}%`);
        
        const { data, error } = await req;
        if (error) return [];
        
        let results = data || [];
        
        if (category) {
            const cats = Array.isArray(category) ? category : [category];
            const lowerCats = cats.map(c => c.trim().toLowerCase());
            // JS mein filter karo taake capital/small letters ka masla khatam ho
            results = results.filter(p => p.category_slug && lowerCats.includes(p.category_slug.trim().toLowerCase()));
        }
        
        return results;
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
        customCats.forEach(c => {
            const idx = merged.findIndex(m => m.slug.toLowerCase() === c.slug.toLowerCase());
            if (idx > -1) merged[idx] = c; 
            else merged.push(c); 
        });

        return merged.filter(c => c.name !== '__DELETED__');
    }
};
