-- ============================================================
-- PrimePickHub — SAFE Migration Script (v2)
-- Yeh script purana data DELETE NAHI karti.
-- Sirf missing tables, columns, RPCs, aur storage bucket add karti hai.
-- ============================================================

-- ==================== 1. PROFILES ====================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger function (safe to replace)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role) VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Policies
DROP POLICY IF EXISTS "users read own profile" ON public.profiles;
CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
CREATE POLICY "admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== 2. PRODUCTS ====================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  review_html TEXT,
  image_url TEXT,
  badge TEXT,
  rating NUMERIC(2,1),
  reviews_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_trending BOOLEAN DEFAULT false,
  category_slug TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Missing columns (safe add)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS event_name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_end_date TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS event_name_2 TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_end_date_2 TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_special_deal BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS blog_status TEXT DEFAULT 'none';

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read products" ON public.products;
CREATE POLICY "public read products" ON public.products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin insert products" ON public.products;
CREATE POLICY "admin insert products" ON public.products FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "admin update products" ON public.products;
CREATE POLICY "admin update products" ON public.products FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "admin delete products" ON public.products;
CREATE POLICY "admin delete products" ON public.products FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== 3. AFFILIATE OFFERS ====================
CREATE TABLE IF NOT EXISTS public.affiliate_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'PKR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.affiliate_offers ADD COLUMN IF NOT EXISTS product_color TEXT;
ALTER TABLE public.affiliate_offers ADD COLUMN IF NOT EXISTS variation_name TEXT;
ALTER TABLE public.affiliate_offers ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2);
ALTER TABLE public.affiliate_offers ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.affiliate_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read offers" ON public.affiliate_offers;
CREATE POLICY "public read offers" ON public.affiliate_offers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin write offers" ON public.affiliate_offers;
CREATE POLICY "admin write offers" ON public.affiliate_offers FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== 4. CLICKS ====================
CREATE TABLE IF NOT EXISTS public.clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID,
  store TEXT,
  sub_id TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert clicks" ON public.clicks;
CREATE POLICY "anon insert clicks" ON public.clicks FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin read clicks" ON public.clicks;
CREATE POLICY "admin read clicks" ON public.clicks FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== 5. SITE SETTINGS (MISSING THA) ====================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  show_app_download BOOLEAN DEFAULT true,
  special_deal_title TEXT DEFAULT 'First order deal',
  title_font_family TEXT DEFAULT 'Poppins',
  title_font_size TEXT DEFAULT '2rem',
  title_font_weight TEXT DEFAULT '800',
  title_font_style TEXT DEFAULT 'normal',
  flash_title_text TEXT DEFAULT 'Sale Section 1',
  flash_title_font_family TEXT DEFAULT 'Poppins',
  flash_title_font_size TEXT DEFAULT '2rem',
  flash_title_font_weight TEXT DEFAULT '900',
  flash_title_font_style TEXT DEFAULT 'normal',
  sale_section_2_title TEXT DEFAULT 'Sale Section 2',
  sale_section_2_font_family TEXT DEFAULT 'Poppins',
  sale_section_2_font_size TEXT DEFAULT '2rem',
  sale_section_2_font_weight TEXT DEFAULT '900',
  sale_section_2_font_style TEXT DEFAULT 'normal',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default row insert karein (safe)
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read settings" ON public.site_settings;
CREATE POLICY "public read settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin write settings" ON public.site_settings;
CREATE POLICY "admin write settings" ON public.site_settings FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== 6. APP NOTIFICATIONS (MISSING THA) ====================
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  product_slug TEXT,
  type TEXT DEFAULT 'product',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read notifications" ON public.app_notifications;
CREATE POLICY "public read notifications" ON public.app_notifications FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin insert notifications" ON public.app_notifications;
CREATE POLICY "admin insert notifications" ON public.app_notifications FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== 7. NEWSLETTER SUBSCRIBERS (MISSING THA) ====================
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public insert newsletter" ON public.newsletter_subscribers;
CREATE POLICY "public insert newsletter" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin read newsletter" ON public.newsletter_subscribers;
CREATE POLICY "admin read newsletter" ON public.newsletter_subscribers FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== 8. BLOGS (MISSING THA) ====================
CREATE TABLE IF NOT EXISTS public.blogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content_html TEXT NOT NULL,
  image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read published blogs" ON public.blogs;
CREATE POLICY "public read published blogs" ON public.blogs FOR SELECT TO anon, authenticated 
  USING (is_published = true);

DROP POLICY IF EXISTS "admin read all blogs" ON public.blogs;
CREATE POLICY "admin read all blogs" ON public.blogs FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "admin write blogs" ON public.blogs;
CREATE POLICY "admin write blogs" ON public.blogs FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== 9. DISCOVERED PRODUCTS (AI Hunter) ====================
CREATE TABLE IF NOT EXISTS public.discovered_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asin_or_id TEXT UNIQUE,
  title TEXT NOT NULL,
  image_url TEXT,
  original_url TEXT,
  platform TEXT,
  source TEXT,
  country TEXT,
  category TEXT,
  price NUMERIC(10,2),
  sales_count INT,
  rank_position INT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.discovered_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin manage discovered" ON public.discovered_products;
CREATE POLICY "admin manage discovered" ON public.discovered_products FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== 10. WEBSITE VISITORS ====================
CREATE TABLE IF NOT EXISTS public.website_visitors (
  visitor_id TEXT PRIMARY KEY,
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.website_visitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public upsert visitors" ON public.website_visitors;
CREATE POLICY "public upsert visitors" ON public.website_visitors FOR ALL TO anon, authenticated 
  USING (true) WITH CHECK (true);

-- ==================== 11. ACTIVE APP INSTALLS ====================
CREATE TABLE IF NOT EXISTS public.active_app_installs (
  device_id TEXT PRIMARY KEY,
  last_active TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.active_app_installs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public upsert installs" ON public.active_app_installs;
CREATE POLICY "public upsert installs" ON public.active_app_installs FOR ALL TO anon, authenticated 
  USING (true) WITH CHECK (true);

-- ==================== 12. INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_slug);
CREATE INDEX IF NOT EXISTS idx_offers_product ON public.affiliate_offers(product_id);
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON public.blogs(slug);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_blog_status ON public.products(blog_status);

-- ==================== 13. RPC FUNCTIONS (Admin Stats ke liye) ====================
CREATE OR REPLACE FUNCTION public.get_total_visitors()
RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*) FROM public.website_visitors;
$$;

CREATE OR REPLACE FUNCTION public.get_active_app_installs()
RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*) FROM public.active_app_installs;
$$;

-- ==================== 14. STORAGE BUCKET (Product Images) ====================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects 
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated upload product images" ON storage.objects;
CREATE POLICY "Authenticated upload product images" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated update product images" ON storage.objects;
CREATE POLICY "Authenticated update product images" ON storage.objects 
  FOR UPDATE TO authenticated USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated delete product images" ON storage.objects;
CREATE POLICY "Authenticated delete product images" ON storage.objects 
  FOR DELETE TO authenticated USING (bucket_id = 'product-images');

-- ==================== DONE ====================
