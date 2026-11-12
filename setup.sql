-- ============================================================
-- PrimePickHub — Complete Database Setup (SAFE VERSION v3.2)
-- Run this in Supabase SQL Editor
-- ============================================================

-- ==================== PROFILES ====================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own profile" ON public.profiles;
CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
CREATE POLICY "admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
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

-- ==================== PRODUCTS ====================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  review_html TEXT,
  image_url TEXT,
  gallery_images TEXT[] DEFAULT '{}',
  video_url TEXT,
  badge TEXT,
  rating NUMERIC(2,1),
  reviews_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_trending BOOLEAN DEFAULT false,
  is_special_deal BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  category_slug TEXT DEFAULT 'general',
  event_name TEXT,
  sale_end_date TIMESTAMPTZ,
  event_name_2 TEXT,
  sale_end_date_2 TIMESTAMPTZ,
  blog_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_special_deal BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS event_name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_end_date TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS event_name_2 TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_end_date_2 TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS blog_status TEXT;
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

-- ==================== AFFILIATE OFFERS ====================
CREATE TABLE IF NOT EXISTS public.affiliate_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  product_color TEXT,
  color_name TEXT,
  variation_name TEXT,
  affiliate_url TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  sale_price NUMERIC(10,2),
  commission_rate NUMERIC(5,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.affiliate_offers ADD COLUMN IF NOT EXISTS product_color TEXT;
ALTER TABLE public.affiliate_offers ADD COLUMN IF NOT EXISTS color_name TEXT;
ALTER TABLE public.affiliate_offers ADD COLUMN IF NOT EXISTS variation_name TEXT;
ALTER TABLE public.affiliate_offers ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2);
ALTER TABLE public.affiliate_offers ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.affiliate_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read offers" ON public.affiliate_offers;
CREATE POLICY "public read offers" ON public.affiliate_offers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin write offers" ON public.affiliate_offers;
CREATE POLICY "admin write offers" ON public.affiliate_offers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== PRODUCT REVIEWS (NEW ⭐) ====================
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read approved reviews" ON public.product_reviews;
CREATE POLICY "public read approved reviews" ON public.product_reviews FOR SELECT TO anon, authenticated USING (status = 'approved');

DROP POLICY IF EXISTS "anon insert reviews" ON public.product_reviews;
CREATE POLICY "anon insert reviews" ON public.product_reviews FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin all reviews" ON public.product_reviews;
CREATE POLICY "admin all reviews" ON public.product_reviews FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== CLICKS ====================
CREATE TABLE IF NOT EXISTS public.clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID,
  store TEXT,
  sub_id TEXT,
  referrer TEXT,
  country TEXT DEFAULT 'Unknown',
  city TEXT DEFAULT 'Unknown',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.clicks ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Unknown';
ALTER TABLE public.clicks ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Unknown';
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert clicks" ON public.clicks;
CREATE POLICY "anon insert clicks" ON public.clicks FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin read clicks" ON public.clicks;
CREATE POLICY "admin read clicks" ON public.clicks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== SITE SETTINGS ====================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  show_app_download BOOLEAN DEFAULT true,
  show_floating_app_btn BOOLEAN DEFAULT true,
  special_deal_title TEXT DEFAULT 'First order deal',
  title_font_family TEXT DEFAULT 'Poppins',
  title_font_size TEXT DEFAULT '2rem',
  title_font_weight TEXT DEFAULT '800',
  title_font_style TEXT DEFAULT 'normal',
  flash_title_text TEXT DEFAULT 'Mega Sale 11.11',
  flash_title_font_family TEXT DEFAULT 'Poppins',
  flash_title_font_size TEXT DEFAULT '2rem',
  flash_title_font_weight TEXT DEFAULT '900',
  flash_title_font_style TEXT DEFAULT 'normal',
  sale_section_2_title TEXT DEFAULT 'Winter Sale 2.2',
  sale_section_2_font_family TEXT DEFAULT 'Poppins',
  sale_section_2_font_size TEXT DEFAULT '2rem',
  sale_section_2_font_weight TEXT DEFAULT '900',
  sale_section_2_font_style TEXT DEFAULT 'normal',
  custom_categories JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS show_app_download BOOLEAN DEFAULT true;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS show_floating_app_btn BOOLEAN DEFAULT true;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS custom_categories JSONB;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read settings" ON public.site_settings;
CREATE POLICY "public read settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin update settings" ON public.site_settings;
CREATE POLICY "admin update settings" ON public.site_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ==================== BLOGS ====================
CREATE TABLE IF NOT EXISTS public.blogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content_html TEXT,
  image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read published blogs" ON public.blogs;
CREATE POLICY "public read published blogs" ON public.blogs FOR SELECT TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "admin all blogs" ON public.blogs;
CREATE POLICY "admin all blogs" ON public.blogs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== OTHER TABLES (Notifications, Newsletter, Visitors, Installs) ====================
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  product_slug TEXT,
  type TEXT DEFAULT 'product',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.app_notifications ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read notifications" ON public.app_notifications;
CREATE POLICY "public read notifications" ON public.app_notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin insert notifications" ON public.app_notifications;
CREATE POLICY "admin insert notifications" ON public.app_notifications FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "anyone can subscribe" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin read subscribers" ON public.newsletter_subscribers;
CREATE POLICY "admin read subscribers" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS public.website_visitors (
  visitor_id TEXT PRIMARY KEY,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  referrer TEXT DEFAULT 'Direct',
  device_type TEXT DEFAULT 'Unknown',
  country TEXT DEFAULT 'Unknown',
  city TEXT DEFAULT 'Unknown'
);
ALTER TABLE public.website_visitors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon upsert visitors" ON public.website_visitors;
CREATE POLICY "anon upsert visitors" ON public.website_visitors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.active_app_installs (
  device_id TEXT PRIMARY KEY,
  first_active TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  country TEXT DEFAULT 'Unknown',
  city TEXT DEFAULT 'Unknown',
  device_type TEXT DEFAULT 'Mobile'
);
ALTER TABLE public.active_app_installs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon upsert installs" ON public.active_app_installs;
CREATE POLICY "anon upsert installs" ON public.active_app_installs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.discovered_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asin_or_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  original_url TEXT,
  platform TEXT,
  country TEXT,
  category TEXT,
  price NUMERIC(10,2),
  sales_count INT,
  rank_position INT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== RPC FUNCTIONS ====================
DROP FUNCTION IF EXISTS public.get_total_visitors();
CREATE OR REPLACE FUNCTION public.get_total_visitors()
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER FROM public.website_visitors;
$$;

DROP FUNCTION IF EXISTS public.get_active_app_installs();
CREATE OR REPLACE FUNCTION public.get_active_app_installs()
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER FROM public.active_app_installs WHERE last_active > (NOW() - INTERVAL '30 days');
$$;

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_slug);
CREATE INDEX IF NOT EXISTS idx_products_available ON public.products(is_available);
CREATE INDEX IF NOT EXISTS idx_offers_product ON public.affiliate_offers(product_id);
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON public.blogs(slug);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_created ON public.clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.product_reviews(product_id);

-- ==================== STORAGE BUCKETS ====================
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('customer-review-photos', 'customer-review-photos', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies for Product Images
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-images');
DROP POLICY IF EXISTS "Admin upload product images" ON storage.objects;
CREATE POLICY "Admin upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;
CREATE POLICY "Admin delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Storage Policies for Customer Review Photos
DROP POLICY IF EXISTS "Public read review photos" ON storage.objects;
CREATE POLICY "Public read review photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'customer-review-photos');
DROP POLICY IF EXISTS "Anyone can upload review photos" ON storage.objects;
CREATE POLICY "Anyone can upload review photos" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'customer-review-photos');
DROP POLICY IF EXISTS "Admin delete review photos" ON storage.objects;
CREATE POLICY "Admin delete review photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'customer-review-photos' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
