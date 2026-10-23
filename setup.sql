-- ==================== DROP OLD TABLES (Fresh Start) ====================
DROP TABLE IF EXISTS public.affiliate_offers CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.clicks CASCADE;

-- ==================== PRODUCTS ====================
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT, -- Short description
  review_html TEXT, -- ⭐ SEO Content (300-500 words)
  image_url TEXT,
  badge TEXT,
  rating NUMERIC(2,1),
  reviews_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_trending BOOLEAN DEFAULT false,
  category_slug TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read products" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin update products" ON public.products FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin delete products" ON public.products FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== AFFILIATE OFFERS ====================
CREATE TABLE public.affiliate_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL, -- ⭐ Price is now REQUIRED for Google Rich Results
  currency TEXT DEFAULT 'PKR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.affiliate_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read offers" ON public.affiliate_offers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write offers" ON public.affiliate_offers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== CLICKS ====================
CREATE TABLE public.clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID,
  store TEXT,
  sub_id TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert clicks" ON public.clicks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin read clicks" ON public.clicks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== INDEXES ====================
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_category ON public.products(category_slug);
CREATE INDEX idx_offers_product ON public.affiliate_offers(product_id);