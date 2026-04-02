-- Fix for deployments where memberships.user_id references public.users(id)
-- while account creation happens in auth.users.

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE NOTICE 'public.users table not found, skipping sync migration.';
    RETURN;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RETURN NEW;
  END IF;

  -- Minimal guaranteed sync (id). Other columns may differ by project schema.
  BEGIN
    INSERT INTO public.users (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'sync_auth_user_to_public_users(id) failed for %: %', NEW.id, SQLERRM;
  END;

  -- Optional email sync when column exists.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    BEGIN
      UPDATE public.users
      SET email = NEW.email
      WHERE id = NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'sync_auth_user_to_public_users(email) failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_sync_public_users ON auth.users;
CREATE TRIGGER on_auth_user_sync_public_users
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_user_to_public_users();

-- Backfill existing auth users into public.users to satisfy memberships FK.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.users (id)
    SELECT u.id
    FROM auth.users u
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Backfill public.users(id) from auth.users failed: %', SQLERRM;
  END;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    BEGIN
      UPDATE public.users pu
      SET email = au.email
      FROM auth.users au
      WHERE pu.id = au.id
        AND (pu.email IS DISTINCT FROM au.email);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Backfill public.users(email) from auth.users failed: %', SQLERRM;
    END;
  END IF;
END $$;
