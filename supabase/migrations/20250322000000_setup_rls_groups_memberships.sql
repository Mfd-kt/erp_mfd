-- RLS pour la configuration initiale : permettre aux utilisateurs authentifiés
-- de créer un groupe et leur membership quand ils n'en ont pas encore.

-- groups : INSERT + SELECT pour les utilisateurs authentifiés (setup)
DROP POLICY IF EXISTS groups_insert_authenticated ON groups;
CREATE POLICY groups_insert_authenticated ON groups
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS groups_select_authenticated ON groups;
CREATE POLICY groups_select_authenticated ON groups
  FOR SELECT TO authenticated
  USING (true);

-- memberships : INSERT pour les utilisateurs qui créent leur propre membership (setup)
DROP POLICY IF EXISTS memberships_insert_own ON memberships;
CREATE POLICY memberships_insert_own ON memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- countries / currencies : upsert pour le setup (référentiels)
DROP POLICY IF EXISTS countries_insert_authenticated ON countries;
CREATE POLICY countries_insert_authenticated ON countries
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS countries_select_authenticated ON countries;
CREATE POLICY countries_select_authenticated ON countries
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS currencies_insert_authenticated ON currencies;
CREATE POLICY currencies_insert_authenticated ON currencies
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS currencies_select_authenticated ON currencies;
CREATE POLICY currencies_select_authenticated ON currencies
  FOR SELECT TO authenticated
  USING (true);
