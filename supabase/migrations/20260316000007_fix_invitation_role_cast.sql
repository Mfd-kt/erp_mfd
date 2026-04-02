CREATE OR REPLACE FUNCTION public.admin_accept_company_invitation(p_invitation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_inv RECORD;
  v_user_id uuid;
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
  VALUES (
    v_user_id,
    v_inv.group_id,
    v_inv.company_id,
    (v_inv.role::text)::public.membership_role
  )
  ON CONFLICT DO NOTHING;

  UPDATE public.company_member_invitations
  SET status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE id = v_inv.id;

  RETURN v_user_id;
END;
$$;
