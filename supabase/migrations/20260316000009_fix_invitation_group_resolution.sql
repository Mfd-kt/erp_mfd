CREATE OR REPLACE FUNCTION public.admin_accept_company_invitation(p_invitation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_inv RECORD;
  v_user_id uuid;
  v_company_group_id uuid;
BEGIN
  SELECT id, company_id, group_id, email, role, status
  INTO v_inv
  FROM public.company_member_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'Invitation introuvable.';
  END IF;
  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation non active.';
  END IF;

  -- Always trust company.group_id (source of truth), not invitation.group_id
  SELECT c.group_id
  INTO v_company_group_id
  FROM public.companies c
  WHERE c.id = v_inv.company_id;

  IF v_company_group_id IS NULL THEN
    RAISE EXCEPTION 'Entreprise introuvable ou group_id manquant.';
  END IF;

  SELECT u.id
  INTO v_user_id
  FROM auth.users u
  WHERE lower(coalesce(u.email, '')) = lower(v_inv.email)
  ORDER BY u.created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun compte Auth trouvé pour cet email.';
  END IF;

  INSERT INTO public.memberships (user_id, group_id, company_id, role)
  SELECT
    u.id,
    v_company_group_id,
    v_inv.company_id,
    (v_inv.role::text)::public.membership_role
  FROM auth.users u
  WHERE u.id = v_user_id
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.user_id = v_user_id
      AND m.group_id = v_company_group_id
      AND m.company_id = v_inv.company_id
  ) THEN
    RAISE EXCEPTION 'Impossible de créer le membership.';
  END IF;

  -- Optional self-heal of stale invitation.group_id
  UPDATE public.company_member_invitations
  SET status = 'accepted',
      group_id = v_company_group_id,
      accepted_at = now(),
      updated_at = now()
  WHERE id = v_inv.id;

  RETURN v_user_id;
END;
$$;
