-- ============================================================
-- PrimePickHub — Complete Database Setup (SAFE VERSION v3)
-- Bar bar chala sakte hain, kuch delete nahi hoga.
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
  variation_name TEXT,
  affiliate_url TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  sale_price NUMERIC(10,2),
  commission_rate NUMERIC(5,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.affiliate_offers ADD COLUMN IF NOT EXISTS variation_name TEXT;
ALTER TABLE public.affiliate_offers ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2);
ALTER TABLE public.affiliate_offers ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.affiliate_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read offers" ON public.affiliate_offers;
CREATE POLICY "public read offers" ON public.affiliate_offers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin write offers" ON public.affiliate_offers;
CREATE POLICY "admin write offers" ON public.affiliate_offers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== CLICKS (with country + city) ====================
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
-- ⭐ Critical: add geo columns (were missing)
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS show_app_download BOOLEAN DEFAULT true;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS special_deal_title TEXT DEFAULT 'First order deal';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS title_font_family TEXT DEFAULT 'Poppins';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS title_font_size TEXT DEFAULT '2rem';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS title_font_weight TEXT DEFAULT '800';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS title_font_style TEXT DEFAULT 'normal';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS flash_title_text TEXT DEFAULT 'Mega Sale 11.11';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS flash_title_font_family TEXT DEFAULT 'Poppins';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS flash_title_font_size TEXT DEFAULT '2rem';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS flash_title_font_weight TEXT DEFAULT '900';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS flash_title_font_style TEXT DEFAULT 'normal';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS sale_section_2_title TEXT DEFAULT 'Winter Sale 2.2';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS sale_section_2_font_family TEXT DEFAULT 'Poppins';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS sale_section_2_font_size TEXT DEFAULT '2rem';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS sale_section_2_font_weight TEXT DEFAULT '900';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS sale_section_2_font_style TEXT DEFAULT 'normal';
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
CREATE POLICY "public read published blogs" ON public.blogs FOR SELECT TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "admin all blogs" ON public.blogs;
CREATE POLICY "admin all blogs" ON public.blogs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== APP NOTIFICATIONS (with is_deleted) ====================
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  product_slug TEXT,
  type TEXT DEFAULT 'product',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ⭐ Critical: add is_deleted (was missing)
ALTER TABLE public.app_notifications ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.app_notifications ADD COLUMN IF NOT EXISTS product_slug TEXT;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read notifications" ON public.app_notifications;
CREATE POLICY "public read notifications" ON public.app_notifications FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin insert notifications" ON public.app_notifications;
CREATE POLICY "admin insert notifications" ON public.app_notifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== NEWSLETTER ====================
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "anyone can subscribe" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin read subscribers" ON public.newsletter_subscribers;
CREATE POLICY "admin read subscribers" ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==================== VISITORS (with referrer + device + geo) ====================
CREATE TABLE IF NOT EXISTS public.website_visitors (
  visitor_id TEXT PRIMARY KEY,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  referrer TEXT DEFAULT 'Direct',
  device_type TEXT DEFAULT 'Unknown',
  country TEXT DEFAULT 'Unknown',
  city TEXT DEFAULT 'Unknown'
);
-- ⭐ Critical: add tracking columns (were missing)
ALTER TABLE public.website_visitors ADD COLUMN IF NOT EXISTS referrer TEXT DEFAULT 'Direct';
ALTER TABLE public.website_visitors ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'Unknown';
ALTER TABLE public.website_visitors ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Unknown';
ALTER TABLE public.website_visitors ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Unknown';
ALTER TABLE public.website_visitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon upsert visitors" ON public.website_visitors;
CREATE POLICY "anon upsert visitors" ON public.website_visitors FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ==================== APP INSTALLS (with geo) ====================
CREATE TABLE IF NOT EXISTS public.active_app_installs (
  device_id TEXT PRIMARY KEY,
  first_active TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  country TEXT DEFAULT 'Unknown',
  city TEXT DEFAULT 'Unknown'
);
-- ⭐ Critical: add geo columns (were missing)
ALTER TABLE public.active_app_installs ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Unknown';
ALTER TABLE public.active_app_installs ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Unknown';
ALTER TABLE public.active_app_installs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon upsert installs" ON public.active_app_installs;
CREATE POLICY "anon upsert installs" ON public.active_app_installs FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ==================== NOTIFICATION TRIGGERS (were missing from setup.sql) ====================

-- 1. Special Deal trigger
CREATE OR REPLACE FUNCTION public.notify_special_deal()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_special_deal = true AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.is_special_deal IS NULL OR OLD.is_special_deal = false))) THEN
        INSERT INTO public.app_notifications (title, message, type, product_slug)
        VALUES ('Special Deal Alert! 🌟', NEW.title || ' is now in the Special Deal section!', 'special_deal', NEW.slug);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_product_special_deal ON public.products;
CREATE TRIGGER on_product_special_deal
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.notify_special_deal();

-- 2. Flash Sale trigger
CREATE OR REPLACE FUNCTION public.notify_product_flash_sale()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sale_end_date IS NOT NULL AND (OLD.sale_end_date IS NULL OR NEW.sale_end_date > OLD.sale_end_date) THEN
        INSERT INTO public.app_notifications (title, message, type, product_slug)
        VALUES ('Flash Sale Alert! ⚡', NEW.title || ' is now on Flash Sale!', 'flash_sale', NEW.slug);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_product_flash_sale ON public.products;
CREATE TRIGGER on_product_flash_sale
  AFTER UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.notify_product_flash_sale();

-- 3. Price Drop trigger
CREATE OR REPLACE FUNCTION public.notify_offer_update()
RETURNS TRIGGER AS $$
DECLARE
    prod_slug TEXT;
    prod_title TEXT;
BEGIN
    IF NEW.sale_price IS NOT NULL AND (OLD.sale_price IS NULL OR NEW.sale_price < OLD.sale_price) THEN
        SELECT slug, title INTO prod_slug, prod_title FROM public.products WHERE id = NEW.product_id;
        IF prod_slug IS NOT NULL THEN
            INSERT INTO public.app_notifications (title, message, type, product_slug)
            VALUES ('Price Drop Alert! 🔥', prod_title || ' price has dropped!', 'price_drop', prod_slug);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_offer_updated ON public.affiliate_offers;
CREATE TRIGGER on_offer_updated
  AFTER UPDATE ON public.affiliate_offers
  FOR EACH ROW EXECUTE FUNCTION public.notify_offer_update();

-- ==================== RPC FUNCTIONS ====================
CREATE OR REPLACE FUNCTION public.get_total_visitors()
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER FROM public.website_visitors;
$$;

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

-- ==================== STORAGE BUCKET ====================
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin upload product images" ON storage.objects;
CREATE POLICY "Admin upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin update product images" ON storage.objects;
CREATE POLICY "Admin update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;
CREATE POLICY "Admin delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
