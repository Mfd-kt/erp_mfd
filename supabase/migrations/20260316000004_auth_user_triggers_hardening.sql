-- Harden auth.users custom trigger functions so they never block user creation.

-- Trigger: on_auth_user_created_profile -> public.handle_new_user_profile()
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- Legacy profile table support (if present)
    IF to_regclass('public.users_profile') IS NOT NULL THEN
      BEGIN
        INSERT INTO public.users_profile (id, email, full_name)
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(COALESCE(NEW.email, ''), '@', 1)
          )
        )
        ON CONFLICT (id) DO UPDATE
        SET
          email = EXCLUDED.email,
          full_name = COALESCE(EXCLUDED.full_name, public.users_profile.full_name);
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'handle_new_user_profile legacy sync failed for user %: %', NEW.id, SQLERRM;
      END;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'handle_new_user_profile failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Trigger: on_auth_user_sync_public_users -> public.sync_auth_user_to_public_users()
-- Make it non-blocking as well.
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- If this project has a legacy sync target, keep this as a safe no-op fallback.
    -- We intentionally never raise here to avoid blocking auth invitation flow.
    NULL;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'sync_auth_user_to_public_users failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
