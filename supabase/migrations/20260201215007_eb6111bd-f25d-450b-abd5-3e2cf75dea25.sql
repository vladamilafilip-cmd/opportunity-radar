-- Add unique constraint on profiles.user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_user_id_key' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Create bootstrap_user function for self-healing user data
CREATE OR REPLACE FUNCTION public.bootstrap_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _email text := auth.email();
  _free_plan_id uuid;
  _result jsonb := '{"profile": false, "role": false, "subscription": false, "portfolio": false}'::jsonb;
BEGIN
  -- Must be authenticated
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1) Insert profile if missing
  INSERT INTO public.profiles (user_id, email)
  VALUES (_user_id, COALESCE(_email, 'unknown@example.com'))
  ON CONFLICT (user_id) DO NOTHING;
  
  IF FOUND THEN
    _result := jsonb_set(_result, '{profile}', 'true');
  END IF;

  -- 2) Insert 'user' role if missing
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  IF FOUND THEN
    _result := jsonb_set(_result, '{role}', 'true');
  END IF;

  -- 3) Insert free subscription if no active subscription exists
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = _user_id AND status = 'active'
  ) THEN
    SELECT id INTO _free_plan_id FROM public.plans WHERE tier = 'free' LIMIT 1;
    
    IF _free_plan_id IS NOT NULL THEN
      INSERT INTO public.subscriptions (user_id, plan_id, status)
      VALUES (_user_id, _free_plan_id, 'active');
      _result := jsonb_set(_result, '{subscription}', 'true');
    END IF;
  END IF;

  -- 4) Insert default portfolio if none exists
  IF NOT EXISTS (
    SELECT 1 FROM public.portfolios WHERE user_id = _user_id
  ) THEN
    INSERT INTO public.portfolios (user_id, name, is_paper)
    VALUES (_user_id, 'Paper Trading', true);
    _result := jsonb_set(_result, '{portfolio}', 'true');
  END IF;

  RETURN _result;
END;
$$;

-- Make handle_new_user idempotent with ON CONFLICT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _free_plan_id uuid;
BEGIN
  -- Insert profile (idempotent)
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert 'user' role (idempotent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Insert free subscription if none exists
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = NEW.id AND status = 'active'
  ) THEN
    SELECT id INTO _free_plan_id FROM public.plans WHERE tier = 'free' LIMIT 1;
    IF _free_plan_id IS NOT NULL THEN
      INSERT INTO public.subscriptions (user_id, plan_id, status)
      VALUES (NEW.id, _free_plan_id, 'active');
    END IF;
  END IF;
  
  -- Insert default portfolio if none exists
  IF NOT EXISTS (
    SELECT 1 FROM public.portfolios WHERE user_id = NEW.id
  ) THEN
    INSERT INTO public.portfolios (user_id, name, is_paper)
    VALUES (NEW.id, 'Paper Trading', true);
  END IF;
  
  RETURN NEW;
END;
$$;