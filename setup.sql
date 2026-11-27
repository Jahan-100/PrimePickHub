-- ============================================================
-- PrimePickHub — SAFE ADDITIVE MIGRATION (FIXED v4.1)
-- ============================================================

-- ⭐ 0. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ⭐ 1. is_admin() helper (SECURITY DEFINER — no recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- ⭐ 2. Fix profiles infinite recursion
DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
CREATE POLICY "admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

-- ⭐ 3. Add missing columns to clicks
ALTER TABLE public.clicks ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'Unknown';
ALTER TABLE public.clicks ADD COLUMN IF NOT EXISTS visitor_id TEXT;

-- ⭐ 4. Add missing SEO columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS focus_keyword TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- ⭐ 5. save_product_offers RPC (FIXED: Safe UUID handling)
CREATE OR REPLACE FUNCTION public.save_product_offers(p_product_id UUID, p_offers JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  DELETE FROM public.affiliate_offers WHERE product_id = p_product_id;
  IF jsonb_array_length(p_offers) = 0 THEN RETURN; END IF;

  FOR o IN SELECT * FROM jsonb_array_elements(p_offers) LOOP
    -- Safe UUID generation if the provided ID is not a valid UUID
    BEGIN
      v_id := (o->>'id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_id := gen_random_uuid();
    END;
    
    IF v_id IS NULL THEN v_id := gen_random_uuid(); END IF;

    INSERT INTO public.affiliate_offers (
      id, product_id, store_name, product_color, color_name, variation_name,
      affiliate_url, price, sale_price, commission_rate, currency
    ) VALUES (
      v_id, p_product_id, o->>'store_name',
      NULLIF(o->>'product_color', ''), NULLIF(o->>'color_name', ''), NULLIF(o->>'variation_name', ''),
      o->>'affiliate_url', COALESCE(NULLIF(o->>'price', '')::numeric, 0),
      NULLIF(o->>'sale_price', '')::numeric, COALESCE(NULLIF(o->>'commission_rate', '')::numeric, 0),
      COALESCE(NULLIF(o->>'currency', ''), 'USD')
    );
  END LOOP;
END; $$;

-- ⭐ 6. Fix product_reviews insert policy (force pending, limit images)
DROP POLICY IF EXISTS "anon insert reviews" ON public.product_reviews;
CREATE POLICY "anon insert reviews" ON public.product_reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending' AND coalesce(array_length(images, 1), 0) <= 3
    AND (images IS NULL OR array_length(images, 1) IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(images) u WHERE u NOT LIKE 'https://smxjiwywepeaybhekrck.supabase.co/storage/v1/object/public/customer-review-photos/%'
    ))
  );

-- ⭐ 7. Tighten website_visitors RLS
DROP POLICY IF EXISTS "anon upsert visitors" ON public.website_visitors;
CREATE POLICY "anon insert visitors" ON public.website_visitors FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon update visitors" ON public.website_visitors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin read visitors" ON public.website_visitors FOR SELECT TO authenticated USING (public.is_admin());

-- ⭐ 8. Tighten active_app_installs RLS
DROP POLICY IF EXISTS "anon upsert installs" ON public.active_app_installs;
CREATE POLICY "anon insert installs" ON public.active_app_installs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon update installs" ON public.active_app_installs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin read installs" ON public.active_app_installs FOR SELECT TO authenticated USING (public.is_admin());

-- ⭐ 9. Enable RLS on discovered_products
ALTER TABLE public.discovered_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin all discovered" ON public.discovered_products;
CREATE POLICY "admin all discovered" ON public.discovered_products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ⭐ 10. Update all admin policies to use is_admin()
DROP POLICY IF EXISTS "admin insert products" ON public.products;
CREATE POLICY "admin insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin update products" ON public.products;
CREATE POLICY "admin update products" ON public.products FOR UPDATE TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "admin delete products" ON public.products;
CREATE POLICY "admin delete products" ON public.products FOR DELETE TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "admin write offers" ON public.affiliate_offers;
CREATE POLICY "admin write offers" ON public.affiliate_offers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin all reviews" ON public.product_reviews;
CREATE POLICY "admin all reviews" ON public.product_reviews FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin read clicks" ON public.clicks;
CREATE POLICY "admin read clicks" ON public.clicks FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "admin update settings" ON public.site_settings;
CREATE POLICY "admin update settings" ON public.site_settings FOR UPDATE TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "admin all blogs" ON public.blogs;
CREATE POLICY "admin all blogs" ON public.blogs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin insert notifications" ON public.app_notifications;
CREATE POLICY "admin insert notifications" ON public.app_notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin read subscribers" ON public.newsletter_subscribers;
CREATE POLICY "admin read subscribers" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (public.is_admin());

-- ⭐ 11. Storage bucket limits (Safe update)
DO $$
BEGIN
  UPDATE storage.buckets SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
    WHERE id IN ('customer-review-photos', 'product-images');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Storage bucket update skipped (check if buckets exist).';
END $$;

-- ⭐ 12. Performance indexes
CREATE INDEX IF NOT EXISTS idx_clicks_device ON public.clicks(device_type);
CREATE INDEX IF NOT EXISTS idx_clicks_visitor ON public.clicks(visitor_id);
CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON public.clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_special ON public.products(is_special_deal) WHERE is_special_deal = true;
CREATE INDEX IF NOT EXISTS idx_products_trending ON public.products(is_trending) WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured) WHERE is_featured = true;
