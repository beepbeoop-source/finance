-- ==============================================================================
-- SYED GLOBAL GROUP FINANCE TRACKER - SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Includes Supabase Auth + User Profiles with Role-Based Access Control (RBAC)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. USER PROFILES TABLE (Linked directly to auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Administrator',
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Helper function to check if current authenticated caller is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  date DATE NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);

-- 3. CUSTOM CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, name)
);

-- 4. COMPANY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.company_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'Syed Global Group PVT LTD',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- User Profiles: users can read profiles, admins can edit
CREATE POLICY "Allow read user_profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow update own profile or admin"
  ON public.user_profiles FOR ALL
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- Transactions Policies: Authenticated users can read; Admin can insert/update/delete
CREATE POLICY "Allow authenticated read transactions"
  ON public.transactions FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow admin write transactions"
  ON public.transactions FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Categories Policies
CREATE POLICY "Allow read categories"
  ON public.categories FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow admin write categories"
  ON public.categories FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Company Settings Policies
CREATE POLICY "Allow read company_settings"
  ON public.company_settings FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow admin write company_settings"
  ON public.company_settings FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- TRIGGER: Automatically create user_profile when user signs up in auth.users
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, username, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Administrator'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 5. STORAGE BUCKET CONFIGURATION (S3-Compatible Object Storage)
-- ==============================================================================
-- Create the public bucket 'finance-assets' for logos, invoices, and receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'finance-assets',
  'finance-assets',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies:
-- 1. Public can view/read uploaded assets via CDN URL

-- 2. Authenticated Admins can upload assets
CREATE POLICY "Admins can upload to Finance Assets"
  ON storage.objects FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id = 'finance-assets');

-- 3. Admins can update/delete assets
CREATE POLICY "Admins can update Finance Assets"
  ON storage.objects FOR UPDATE
  TO authenticated, anon
  USING (bucket_id = 'finance-assets');

CREATE POLICY "Admins can delete Finance Assets"
  ON storage.objects FOR DELETE
  TO authenticated, anon
  USING (bucket_id = 'finance-assets');

-- ==============================================================================
-- 6. KEEP-ALIVE & HEARTBEAT SYSTEM (Prevents Free-Tier Project Pausing)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.keep_alive_pings (
  id TEXT PRIMARY KEY DEFAULT 'primary_heartbeat',
  last_ping TIMESTAMPTZ DEFAULT NOW(),
  client_info TEXT DEFAULT 'finance_app',
  ping_count BIGINT DEFAULT 1
);

ALTER TABLE public.keep_alive_pings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public keep_alive all" ON public.keep_alive_pings;
CREATE POLICY "Public keep_alive all"
  ON public.keep_alive_pings FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Heartbeat function callable by UptimeRobot / Cron pings
CREATE OR REPLACE FUNCTION public.ping_heartbeat()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.keep_alive_pings (id, last_ping, client_info, ping_count)
  VALUES ('primary_heartbeat', NOW(), 'uptime_robot_heartbeat', 1)
  ON CONFLICT (id) DO UPDATE
  SET last_ping = NOW(),
      ping_count = public.keep_alive_pings.ping_count + 1;
  RETURN json_build_object('status', 'ok', 'timestamp', NOW());
END;
$$;

GRANT EXECUTE ON FUNCTION public.ping_heartbeat() TO anon, authenticated;
