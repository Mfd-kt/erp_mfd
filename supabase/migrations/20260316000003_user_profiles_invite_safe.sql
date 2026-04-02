-- Make auth invitation resilient even if profile sync fails.

-- 1) Ensure insert policy exists for system/service writes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'user_profiles_insert_system'
  ) THEN
    CREATE POLICY user_profiles_insert_system ON public.user_profiles
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- 2) Replace trigger function with safe version (never blocks auth user creation).
CREATE OR REPLACE FUNCTION public.handle_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.user_profiles (user_id, email, display_name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(COALESCE(NEW.email, ''), '@', 1)
      ),
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      email = EXCLUDED.email,
      display_name = COALESCE(EXCLUDED.display_name, public.user_profiles.display_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
      updated_at = now();
  EXCEPTION
    WHEN OTHERS THEN
      -- Never fail auth.users insert because of profile synchronization.
      RAISE LOG 'handle_auth_user_profile failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
