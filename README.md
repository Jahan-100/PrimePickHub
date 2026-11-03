# PrimePickHub — Deploy Guide

## Quick Deploy (10 minutes)

### 1. Supabase Setup
- Open your Supabase project
- SQL Editor → paste `setup.sql` → Run
  - ⚠️ Yeh script **SAFE** hai. Yeh aap ka purana data delete **NAHI** karti.
  - Yeh sirf missing tables, columns, RPCs, aur storage bucket add karti hai.
- Authentication → Users → Add User (admin@example.com + password)
- SQL Editor → `UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';`
- Storage → Confirm `product-images` bucket exists and is **Public**
- Authentication → URL Configuration → Site URL = your Netlify/Vercel URL

### 2. Update Config
- Open `js/config.js` → change `supabaseUrl` and `supabaseKey` (from Supabase Project Settings → API)

### 3. Vercel Environment Variables (API routes ke liye ZAROORI)
Vercel Project Settings → Environment Variables mein ye add karein:
- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` = from Supabase → Settings → API → service_role key
- `OPENROUTER_API_KEY` = from https://openrouter.ai/keys
- `APIFY_API_TOKEN` = from https://console.apify.com/account/integrations

### 4. Deploy to Netlify/Vercel
- **Netlify:** Drag the entire `primepickhub/` folder to https://app.netlify.com/drop
- **Vercel:** `vercel --prod` or connect GitHub repo

### 5. Done
- Visit `/admin.html` → login with your admin email/password
- Add products → they appear on homepage
- Add blogs → they appear on `/blog.html`

## What's Included in setup.sql (Safe Migration)
- ✅ `profiles` table + auto-trigger
- ✅ `products` table (+ 9 extra columns: gallery, video, sales, blog_status)
- ✅ `affiliate_offers` table (+ 4 extra columns: color, variation, sale_price, commission)
- ✅ `clicks` table (affiliate tracking)
- ✅ `site_settings` table (admin design customization) **[PEHLE MISSING THA]**
- ✅ `app_notifications` table (realtime notifications) **[PEHLE MISSING THA]**
- ✅ `newsletter_subscribers` table **[PEHLE MISSING THA]**
- ✅ `blogs` table (with `is_published` for AI drafts) **[PEHLE MISSING THA]**
- ✅ `discovered_products` table (AI Product Hunter) **[PEHLE MISSING THA]**
- ✅ `website_visitors` table (analytics) **[PEHLE MISSING THA]**
- ✅ `active_app_installs` table (PWA tracking) **[PEHLE MISSING THA]**
- ✅ RPC functions for admin stats **[PEHLE MISSING THAY]**
- ✅ `product-images` storage bucket (public) **[PEHLE MANUAL BANANA PARTA THA]**

## Free Tier Limits
- Supabase: 500MB DB, 50K MAU, 2GB bandwidth/month
- Netlify: 100GB bandwidth/month
- Vercel: 100GB bandwidth/month (Hobby)
- Plenty for first 10K visitors/month
