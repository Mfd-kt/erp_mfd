CREATE TABLE IF NOT EXISTS company_member_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('company_admin', 'finance_manager', 'viewer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  invitation_token uuid NOT NULL DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 day'),
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  sent_count integer NOT NULL DEFAULT 1 CHECK (sent_count > 0),
  invited_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_member_invitations_company_status
  ON company_member_invitations (company_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_member_invitation_pending
  ON company_member_invitations (company_id, lower(email))
  WHERE status = 'pending';

ALTER TABLE company_member_invitations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_member_invitations' AND policyname = 'company_member_invitations_select_auth'
  ) THEN
    CREATE POLICY company_member_invitations_select_auth ON company_member_invitations
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_member_invitations' AND policyname = 'company_member_invitations_insert_auth'
  ) THEN
    CREATE POLICY company_member_invitations_insert_auth ON company_member_invitations
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_member_invitations' AND policyname = 'company_member_invitations_update_auth'
  ) THEN
    CREATE POLICY company_member_invitations_update_auth ON company_member_invitations
      FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
