# PrimePickHub — Deploy Guide

## Quick Deploy (5 minutes)

### 1. Supabase Setup
- Open your Supabase project
- SQL Editor → paste `setup.sql` → Run
- Authentication → Users → Add User (admin@example.com + password)
- SQL Editor → `UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';`
- Authentication → URL Configuration → Site URL = your Netlify URL

### 2. Update Config
- Open `js/config.js` → change `supabaseUrl` and `supabaseKey` (from Supabase Project Settings → API)

### 3. Deploy to Netlify (FREE)
- Go to https://app.netlify.com/drop
- Drag the entire `primepickhub/` folder
- Site is live instantly

### 4. Done
- Visit `/admin.html` → login with your admin email/password
- Add products → they appear on homepage

## Free Tier Limits
- Supabase: 500MB DB, 50K MAU, 2GB bandwidth/month
- Netlify: 100GB bandwidth/month
- Plenty for first 10K visitors/month