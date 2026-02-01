-- =====================================================
-- Security Fix: Block anonymous access to profiles and api_keys tables
-- =====================================================

-- 1. Ensure profiles table has complete RLS protection
-- Add explicit policy to block all anonymous access to profiles
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 2. Ensure api_keys table has complete RLS protection  
-- Add explicit policy to block all anonymous access to api_keys
DROP POLICY IF EXISTS "Block anonymous access to api_keys" ON public.api_keys;
CREATE POLICY "Block anonymous access to api_keys"
ON public.api_keys
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 3. Add additional protection: Restrict profiles SELECT to only authenticated owner
-- Current policy "Users can view own profile" already uses (auth.uid() = user_id)
-- But let's ensure it explicitly targets authenticated role only

-- Recreate profiles SELECT policy to explicitly target authenticated users
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Recreate profiles INSERT policy to explicitly target authenticated users
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Recreate profiles UPDATE policy to explicitly target authenticated users
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Restrict api_keys to authenticated users only
DROP POLICY IF EXISTS "Users can manage own API keys" ON public.api_keys;
CREATE POLICY "Users can manage own API keys"
ON public.api_keys
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);