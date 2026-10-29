/**
 * PrimePickHub API Layer
 * All Supabase operations + Auth
 */
const API = {
    // ---------- AUTH ----------
    async signIn(email, password) {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    async signOut() {
        await window.supabaseClient.auth.signOut();
    },

    async getCurrentUser() {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return null;

        const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        return { user, role: profile?.role || 'user' };
    },

    // ---------- PRODUCTS ----------
    async getHomepageProducts() {
        if (!window.supabaseClient) return { featured: [], trending: [], latest: [] };

        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*, affiliate_offers(*)')
            .order('created_at', { ascending: false });

        if (error || !data) return { featured: [], trending: [], latest: [] };

        return {
            featured: data.filter(p => p.is_featured),
            trending: data.filter(p => p.is_trending),
            // ⭐ 100+ Products fetch karne ke liye limit barha di hai ⭐
            latest: data.slice(0, 100) 
        };
    },

    async getProductBySlug(slug) {
        if (!window.supabaseClient) return null;
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*, affiliate_offers(*)')
            .eq('slug', slug)
            .single();
        return error ? null : data;
    },

    async searchProducts({ query = '', category = '' }) {
        if (!window.supabaseClient) return [];
        let req = window.supabaseClient.from('products').select('*, affiliate_offers(*)');
        if (category) req = req.eq('category_slug', category);
        if (query) req = req.ilike('title', `%${query}%`);
        const { data, error } = await req;
        return error ? [] : (data || []);
    },

    // ---------- ADMIN ----------
    async addProduct(data) {
        const { data: result, error } = await window.supabaseClient
            .from('products').insert([data]).select();
        if (error) throw error;
        return result;
    },

    async getAdminStats() {
        if (!window.supabaseClient) return { totalProducts: 0, totalClicks: 0 };
        const { count: totalProducts } = await window.supabaseClient
            .from('products').select('*', { count: 'exact', head: true });
        const { count: totalClicks } = await window.supabaseClient
            .from('clicks').select('*', { count: 'exact', head: true });
        return { totalProducts: totalProducts || 0, totalClicks: totalClicks || 0 };
    },

    // ---------- CLICK TRACKING ----------
    recordClick(productId, store, subId) {
        if (!window.supabaseClient || !productId) return;
        window.supabaseClient.from('clicks').insert([{
            product_id: productId,
            store: String(store || '').slice(0, 50),
            sub_id: String(subId || '').slice(0, 100),
            referrer: String(document.referrer || '').slice(0, 200)
        }]).then(({ error }) => {
            if (error) console.warn('Track error:', error);
        }).catch(() => {});
    }
};
