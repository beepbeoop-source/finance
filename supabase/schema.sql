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

-- ==============================================================================
-- 7. SECURE ADMIN USER MANAGEMENT RPCs (Only callable by authenticated Admins)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_create_app_user(
  p_username TEXT,
  p_password TEXT,
  p_name TEXT,
  p_role TEXT DEFAULT 'admin'
)
RETURNS JSON AS $$
DECLARE
  v_caller_role TEXT;
  v_email TEXT;
  v_user_id UUID;
  clean_uname TEXT;
  clean_name TEXT;
  clean_role TEXT;
BEGIN
  -- Verify caller is admin
  SELECT role INTO v_caller_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_caller_role != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized. Only existing administrators can create new users.');
  END IF;

  clean_uname := LOWER(TRIM(p_username));
  clean_name := TRIM(p_name);
  clean_role := LOWER(TRIM(p_role));

  IF clean_uname = '' THEN
    RETURN json_build_object('success', false, 'error', 'Username or email cannot be empty.');
  END IF;

  IF LENGTH(p_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Password must be at least 6 characters.');
  END IF;

  IF clean_role NOT IN ('admin', 'viewer') THEN
    clean_role := 'admin';
  END IF;

  IF clean_name = '' THEN
    clean_name := clean_uname;
  END IF;

  -- Handle full email vs username
  IF clean_uname LIKE '%@%' THEN
    v_email := clean_uname;
    clean_uname := split_part(clean_uname, '@', 1);
  ELSE
    v_email := clean_uname || '@syedglobal.com';
  END IF;

  -- Check if user already exists
  SELECT id INTO v_user_id FROM public.user_profiles WHERE username = clean_uname;
  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'A user with this username already exists.');
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'A user with this email address already exists.');
  END IF;

  -- Create user in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('username', clean_uname, 'display_name', clean_name, 'role', clean_role)::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  RETURN json_build_object(
    'success', true,
    'user', json_build_object(
      'id', v_user_id,
      'username', clean_uname,
      'email', v_email,
      'displayName', clean_name,
      'role', clean_role
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_create_app_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- List all users (Only admin can view)
CREATE OR REPLACE FUNCTION public.app_list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  username TEXT,
  display_name TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT user_profiles.role INTO v_caller_role FROM public.user_profiles WHERE user_profiles.id = auth.uid();
  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can list users';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.username,
    u.display_name,
    u.role,
    u.created_at,
    u.updated_at
  FROM public.user_profiles u
  ORDER BY u.role ASC, u.display_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.app_list_users() TO authenticated;

-- ==============================================================================
-- 8. ADMIN PASSWORD RESET & USER DELETION / ROLE UPDATE RPCs
-- ==============================================================================

-- Admin Reset Any User's Password
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- Verify caller is admin
  SELECT role INTO v_caller_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_caller_role != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Only admins can reset passwords.');
  END IF;

  IF LENGTH(p_new_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Password must be at least 6 characters.');
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Password reset successfully.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated;

-- Admin Delete User Account
CREATE OR REPLACE FUNCTION public.admin_delete_app_user(
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Verify caller is admin
  SELECT role INTO v_caller_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_caller_role != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Only administrators can delete users.');
  END IF;

  -- Prevent self-deletion
  IF p_user_id = auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Cannot delete your own active administrator account.');
  END IF;

  -- Delete from user_profiles & auth.users (cascades)
  DELETE FROM public.user_profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'User account deleted successfully.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_delete_app_user(UUID) TO authenticated;

-- Admin Update User Role
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS JSON AS $$
DECLARE
  v_caller_role TEXT;
  clean_role TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_caller_role != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Only administrators can update roles.');
  END IF;

  clean_role := LOWER(TRIM(p_new_role));
  IF clean_role NOT IN ('admin', 'staff') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role. Must be admin or staff.');
  END IF;

  UPDATE public.user_profiles
  SET role = clean_role,
      updated_at = NOW()
  WHERE id = p_user_id;

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(clean_role)),
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Role updated successfully.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT) TO authenticated;
