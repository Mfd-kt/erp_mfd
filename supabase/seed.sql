-- =============================================================================
-- SEED COMPLET ERP MFD — Données de démo / développement
-- =============================================================================
-- Exécuter dans l’ordre (Supabase SQL Editor).
-- IMPORTANT : Remplacez 'VOTRE_USER_ID_AUTH' par l’UUID de votre utilisateur
-- (Supabase Dashboard > Authentication > Users > copier l’ID).
-- =============================================================================

-- Nettoyage (ordre respect des FK)
DELETE FROM exchange_rates;
DELETE FROM recurring_rules;
DELETE FROM payments;
DELETE FROM debts;
DELETE FROM revenues;
DELETE FROM accounts;
DELETE FROM debt_categories;
DELETE FROM debt_types;
DELETE FROM creditors;
DELETE FROM memberships;
DELETE FROM companies;
DELETE FROM groups;

-- Si vous avez une table users_profile (optionnel)
-- DELETE FROM users_profile;

-- =============================================================================
-- 0. PAYS (requis : companies.country_code référence countries)
-- =============================================================================
INSERT INTO countries (code, name)
VALUES ('FR', 'France'), ('DE', 'Allemagne'), ('GB', 'Royaume-Uni'), ('US', 'États-Unis')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 0b. DEVISES (requis : companies.default_currency référence currencies)
-- =============================================================================
INSERT INTO currencies (code, name)
VALUES ('EUR', 'Euro'), ('GBP', 'Livre sterling'), ('USD', 'Dollar américain')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 1. GROUPE
-- =============================================================================
INSERT INTO groups (id, name, base_currency, created_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Groupe Effinor', 'EUR', now());

-- =============================================================================
-- 2. SOCIÉTÉS (business + personal)
-- =============================================================================
INSERT INTO companies (id, group_id, type, legal_name, trade_name, country_code, default_currency, timezone, is_active, created_at) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'business', 'Effinor France SAS', 'Effinor FR', 'FR', 'EUR', 'Europe/Paris', true, now()),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'business', 'Effinor Deutschland GmbH', 'Effinor DE', 'DE', 'EUR', 'Europe/Berlin', true, now()),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'business', 'Effinor UK Ltd', 'Effinor UK', 'GB', 'GBP', 'Europe/London', true, now()),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'personal', 'MFD Personal', 'MFD Personal', 'FR', 'EUR', 'Europe/Paris', true, now());

-- =============================================================================
-- 3. MEMBERSHIP (group_admin sur tout le groupe)
-- =============================================================================
-- On insère avec un UUID factice pour que le seed passe. Ensuite exécutez :
--   UPDATE memberships SET user_id = 'VOTRE_UUID_AUTH' WHERE user_id = '00000000-0000-0000-0000-000000000001';
-- (remplacer VOTRE_UUID_AUTH par l’UUID de votre user dans Supabase > Authentication > Users)
INSERT INTO memberships (id, user_id, group_id, company_id, role, created_at)
SELECT 'c0000000-0000-4000-8000-000000000001', id, 'a0000000-0000-4000-8000-000000000001', NULL, 'group_admin', now()
FROM auth.users
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. TYPES DE DETTES (niveau groupe, company_id NULL si autorisé)
-- =============================================================================
INSERT INTO debt_types (id, company_id, code, name, description, created_at) VALUES
  ('d0000000-0000-4000-8000-000000000001', NULL, 'FOURN', 'Fournisseurs', 'Dettes fournisseurs', now()),
  ('d0000000-0000-4000-8000-000000000002', NULL, 'SALAIRES', 'Salaires', 'Masse salariale', now()),
  ('d0000000-0000-4000-8000-000000000003', NULL, 'LOYER', 'Loyers', 'Loyers et charges', now()),
  ('d0000000-0000-4000-8000-000000000004', NULL, 'ABO', 'Abonnements', 'Abonnements et logiciels', now());

-- =============================================================================
-- 5. CATÉGORIES DE DETTES (par société)
-- =============================================================================
-- Effinor FR
INSERT INTO debt_categories (id, company_id, debt_type_id, code, name, description, is_payroll, is_recurring_default, created_at) VALUES
  ('e1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'FOURN-FR', 'Fournisseurs FR', NULL, false, false, now()),
  ('e1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'SAL-FR', 'Salaires FR', NULL, true, true, now()),
  ('e1000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 'LOYER-FR', 'Loyer bureau Paris', NULL, false, true, now());
-- Effinor DE
INSERT INTO debt_categories (id, company_id, debt_type_id, code, name, description, is_payroll, is_recurring_default, created_at) VALUES
  ('e2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'FOURN-DE', 'Lieferanten', NULL, false, false, now()),
  ('e2000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'SAL-DE', 'Gehälter', NULL, true, true, now());
-- Effinor UK
INSERT INTO debt_categories (id, company_id, debt_type_id, code, name, description, is_payroll, is_recurring_default, created_at) VALUES
  ('e3000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'SUPPL-UK', 'Suppliers', NULL, false, false, now()),
  ('e3000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000004', 'SUB-UK', 'Subscriptions', NULL, false, true, now());

-- MFD Personal (finances personnelles)
INSERT INTO debt_types (id, company_id, code, name, description, created_at) VALUES
  ('d0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000004', 'LOYER', 'Loyer', 'Loyer et charges habitation', now()),
  ('d0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000004', 'ABO', 'Abonnements', 'Netflix, téléphone, etc.', now()),
  ('d0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000004', 'CREDIT', 'Crédit', 'Prêt immobilier, crédit conso', now()),
  ('d0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000004', 'DIVERS', 'Divers', 'Autres dépenses personnelles', now());
INSERT INTO debt_categories (id, company_id, debt_type_id, code, name, description, is_payroll, is_recurring_default, created_at) VALUES
  ('e4000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000005', 'LOYER-PERSO', 'Loyer appartement', NULL, false, true, now()),
  ('e4000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000006', 'ABO-PERSO', 'Abonnements', NULL, false, true, now()),
  ('e4000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000007', 'CREDIT-PERSO', 'Crédit immobilier', NULL, false, true, now()),
  ('e4000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000008', 'DIVERS-PERSO', 'Divers', NULL, false, false, now());

-- =============================================================================
-- 6. CRÉANCIERS
-- =============================================================================
-- FR
INSERT INTO creditors (id, company_id, name, creditor_type, country_code, phone, email, notes, created_at) VALUES
  ('f1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Bureau Paris SCI', 'landlord', 'FR', NULL, NULL, 'Bail commercial', now()),
  ('f1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Ali Benali', 'employee', 'FR', NULL, NULL, 'Salarié', now()),
  ('f1000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Marie Dupont', 'employee', 'FR', NULL, NULL, 'Salariée', now()),
  ('f1000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'Fournisseur Office SA', 'company', 'FR', NULL, NULL, NULL, now()),
  ('f1000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'Adobe France', 'company', 'FR', NULL, NULL, 'Abonnement CC', now());
-- DE
INSERT INTO creditors (id, company_id, name, creditor_type, country_code, phone, email, notes, created_at) VALUES
  ('f2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Büro Berlin GmbH', 'landlord', 'DE', NULL, NULL, NULL, now()),
  ('f2000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Hans Schmidt', 'employee', 'DE', NULL, NULL, NULL, now()),
  ('f2000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'SAP Deutschland', 'company', 'DE', NULL, NULL, NULL, now());
-- UK
INSERT INTO creditors (id, company_id, name, creditor_type, country_code, phone, email, notes, created_at) VALUES
  ('f3000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'London Office Ltd', 'landlord', 'GB', NULL, NULL, NULL, now()),
  ('f3000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'John Smith', 'employee', 'GB', NULL, NULL, NULL, now()),
  ('f3000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'Slack Technologies', 'company', 'GB', NULL, NULL, 'Workspace', now());
-- MFD Personal
INSERT INTO creditors (id, company_id, name, creditor_type, country_code, phone, email, notes, created_at) VALUES
  ('f4000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004', 'Propriétaire appartement', 'landlord', 'FR', NULL, NULL, 'Bail résidence principale', now()),
  ('f4000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000004', 'Banque crédit immobilier', 'bank', 'FR', NULL, NULL, 'Prêt habitat', now()),
  ('f4000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004', 'Orange', 'company', 'FR', NULL, NULL, 'Forfait mobile', now()),
  ('f4000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 'EDF', 'company', 'FR', NULL, NULL, 'Électricité', now()),
  ('f4000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000004', 'Netflix', 'company', 'FR', NULL, NULL, 'Abonnement streaming', now());

-- =============================================================================
-- 7. COMPTES (avec soldes)
-- =============================================================================
-- FR
INSERT INTO accounts (id, company_id, name, account_type, currency_code, opening_balance, current_balance_cached, is_active, created_at) VALUES
  ('91000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Compte courant BNP', 'bank', 'EUR', 45000, 42000, true, now()),
  ('91000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Caisse Paris', 'cash', 'EUR', 500, 500, true, now());
-- DE
INSERT INTO accounts (id, company_id, name, account_type, currency_code, opening_balance, current_balance_cached, is_active, created_at) VALUES
  ('92000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Geschäftskonto', 'bank', 'EUR', 28000, 26500, true, now()),
  ('92000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Barkasse', 'cash', 'EUR', 200, 200, true, now());
-- UK
INSERT INTO accounts (id, company_id, name, account_type, currency_code, opening_balance, current_balance_cached, is_active, created_at) VALUES
  ('93000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'Business Account Barclays', 'bank', 'GBP', 18000, 15200, true, now()),
  ('93000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'Petty cash', 'cash', 'GBP', 300, 300, true, now());
-- MFD Personal
INSERT INTO accounts (id, company_id, name, account_type, currency_code, opening_balance, current_balance_cached, is_active, created_at) VALUES
  ('93500000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004', 'Compte courant perso', 'bank', 'EUR', 5000, 5000, true, now()),
  ('93500000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000004', 'Livret A', 'bank', 'EUR', 10000, 10000, true, now());

-- =============================================================================
-- 8. DETTES (ouvertes, payées, en retard)
-- =============================================================================
-- FR
INSERT INTO debts (id, company_id, creditor_id, debt_category_id, title, description, amount_original, currency_code, fx_rate_to_company_currency, amount_company_currency, due_date, incurred_date, status, priority, is_recurring_instance, source_recurring_rule_id, generated_period_key, notes, created_at) VALUES
  ('94000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000003', 'Loyer mars 2026', NULL, 3500, 'EUR', 1, 3500, '2026-03-05', '2026-03-01', 'open', 'high', false, NULL, NULL, NULL, now()),
  ('94000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000002', 'Salaire Ali mars', NULL, 2800, 'EUR', 1, 2800, '2026-03-28', '2026-03-01', 'open', 'critical', false, NULL, NULL, NULL, now()),
  ('94000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000002', 'Salaire Marie mars', NULL, 3200, 'EUR', 1, 3200, '2026-03-28', '2026-03-01', 'open', 'critical', false, NULL, NULL, NULL, now()),
  ('94000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000001', 'Facture fournisseur 1234', NULL, 5200, 'EUR', 1, 5200, '2026-04-15', '2026-03-10', 'open', 'normal', false, NULL, NULL, NULL, now()),
  ('94000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000005', 'e1000000-0000-4000-8000-000000000001', 'Adobe Creative Cloud', NULL, 59, 'EUR', 1, 59, '2026-03-12', '2026-03-01', 'open', 'low', false, NULL, NULL, NULL, now()),
  ('94000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000003', 'Loyer février 2026', NULL, 3500, 'EUR', 1, 3500, '2026-02-05', '2026-02-01', 'open', 'high', false, NULL, NULL, 'En retard', now());
-- DE
INSERT INTO debts (id, company_id, creditor_id, debt_category_id, title, description, amount_original, currency_code, fx_rate_to_company_currency, amount_company_currency, due_date, incurred_date, status, priority, is_recurring_instance, source_recurring_rule_id, generated_period_key, notes, created_at) VALUES
  ('95000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'Miete März', NULL, 4200, 'EUR', 1, 4200, '2026-03-10', '2026-03-01', 'open', 'high', false, NULL, NULL, NULL, now()),
  ('95000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000002', 'Gehalt Hans März', NULL, 4500, 'EUR', 1, 4500, '2026-03-28', '2026-03-01', 'open', 'critical', false, NULL, NULL, NULL, now()),
  ('95000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000003', 'e2000000-0000-4000-8000-000000000001', 'SAP Lizenz Q1', NULL, 1200, 'EUR', 1, 1200, '2026-04-01', '2026-01-01', 'open', 'normal', false, NULL, NULL, NULL, now());
-- UK
INSERT INTO debts (id, company_id, creditor_id, debt_category_id, title, description, amount_original, currency_code, fx_rate_to_company_currency, amount_company_currency, due_date, incurred_date, status, priority, is_recurring_instance, source_recurring_rule_id, generated_period_key, notes, created_at) VALUES
  ('96000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'f3000000-0000-4000-8000-000000000001', 'e3000000-0000-4000-8000-000000000001', 'Rent March', NULL, 2800, 'GBP', 1, 2800, '2026-03-25', '2026-03-01', 'open', 'high', false, NULL, NULL, NULL, now()),
  ('96000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'f3000000-0000-4000-8000-000000000002', 'e3000000-0000-4000-8000-000000000001', 'Salary John March', NULL, 3500, 'GBP', 1, 3500, '2026-03-28', '2026-03-01', 'open', 'critical', false, NULL, NULL, NULL, now()),
  ('96000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'f3000000-0000-4000-8000-000000000003', 'e3000000-0000-4000-8000-000000000002', 'Slack Pro annual', NULL, 96, 'GBP', 1, 96, '2026-04-01', '2026-03-01', 'open', 'low', false, NULL, NULL, NULL, now());
-- MFD Personal
INSERT INTO debts (id, company_id, creditor_id, debt_category_id, title, description, amount_original, currency_code, fx_rate_to_company_currency, amount_company_currency, due_date, incurred_date, status, priority, is_recurring_instance, source_recurring_rule_id, generated_period_key, notes, created_at) VALUES
  ('96500000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004', 'f4000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000001', 'Loyer mars 2026', NULL, 1200, 'EUR', 1, 1200, '2026-03-05', '2026-03-01', 'open', 'high', false, NULL, NULL, NULL, now()),
  ('96500000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000004', 'f4000000-0000-4000-8000-000000000002', 'e4000000-0000-4000-8000-000000000003', 'Mensualité crédit immobilier', NULL, 850, 'EUR', 1, 850, '2026-03-15', '2026-03-01', 'open', 'critical', false, NULL, NULL, NULL, now()),
  ('96500000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004', 'f4000000-0000-4000-8000-000000000005', 'e4000000-0000-4000-8000-000000000002', 'Netflix', NULL, 18, 'EUR', 1, 18, '2026-03-20', '2026-03-01', 'open', 'low', false, NULL, NULL, NULL, now());

-- =============================================================================
-- 9. PAIEMENTS (quelques dettes partiellement ou totalement payées)
-- =============================================================================
INSERT INTO payments (id, company_id, debt_id, account_id, payment_date, amount, currency_code, fx_rate_to_company_currency, amount_company_currency, payment_method, reference, notes, created_at) VALUES
  ('97000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000006', '91000000-0000-4000-8000-000000000001', '2026-02-10', 3500, 'EUR', 1, 3500, 'virement', 'VIR-LOYER-FEV', NULL, now()),
  ('97000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000001', '2026-03-15', 2000, 'EUR', 1, 2000, 'virement', NULL, 'Acompte', now()),
  ('98000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '2026-03-05', 4200, 'EUR', 1, 4200, 'virement', NULL, NULL, now());

-- =============================================================================
-- 10. REVENUS (attendus et reçus)
-- =============================================================================
INSERT INTO revenues (id, company_id, title, source_name, amount_expected, amount_received, currency_code, account_id, expected_date, received_date, status, notes, created_at) VALUES
  ('99000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Facture client Projet Alpha', 'Client Alpha SA', 15000, 15000, 'EUR', '91000000-0000-4000-8000-000000000001', '2026-03-15', '2026-03-14', 'received', NULL, now()),
  ('99000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Facture client Projet Beta', 'Client Beta', 22000, 0, 'EUR', NULL, '2026-03-30', NULL, 'expected', NULL, now()),
  ('99000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Avoir mars', 'Divers', 800, 0, 'EUR', NULL, '2026-03-20', NULL, 'expected', NULL, now()),
  ('9a000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Rechnung Kunde X', 'Kunde X GmbH', 12000, 12000, 'EUR', '92000000-0000-4000-8000-000000000001', '2026-03-10', '2026-03-09', 'received', NULL, now()),
  ('9a000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Rechnung Kunde Y', 'Kunde Y', 8500, 0, 'EUR', NULL, '2026-04-05', NULL, 'expected', NULL, now()),
  ('9b000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'Invoice Client A', 'Client A Ltd', 9500, 9500, 'GBP', '93000000-0000-4000-8000-000000000001', '2026-03-20', '2026-03-19', 'received', NULL, now()),
  ('9b000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'Invoice Client B', 'Client B', 6000, 0, 'GBP', NULL, '2026-04-15', NULL, 'expected', NULL, now());
-- MFD Personal
INSERT INTO revenues (id, company_id, title, source_name, amount_expected, amount_received, currency_code, account_id, expected_date, received_date, status, notes, created_at) VALUES
  ('9c500000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004', 'Salaire mars', 'Employeur', 3500, 3500, 'EUR', '93500000-0000-4000-8000-000000000001', '2026-03-28', '2026-03-27', 'received', NULL, now()),
  ('9c500000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000004', 'Allocation CAF', 'CAF', 200, 0, 'EUR', NULL, '2026-03-15', NULL, 'expected', NULL, now());

-- =============================================================================
-- 11. RÈGLES RÉCURRENTES
-- =============================================================================
-- FR: salaires, loyer, abo
INSERT INTO recurring_rules (id, company_id, creditor_id, debt_category_id, title, template_description, amount, currency_code, frequency, day_of_month, start_date, end_date, next_run_date, auto_generate, is_active, created_at) VALUES
  ('9c000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000002', 'Salaire Ali', 'Mensuel', 2800, 'EUR', 'monthly', 28, '2025-01-01', NULL, '2026-04-01', true, true, now()),
  ('9c000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000002', 'Salaire Marie', 'Mensuel', 3200, 'EUR', 'monthly', 28, '2025-01-01', NULL, '2026-04-01', true, true, now()),
  ('9c000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000003', 'Loyer bureau Paris', NULL, 3500, 'EUR', 'monthly', 5, '2025-01-01', NULL, '2026-04-01', true, true, now()),
  ('9c000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000005', 'e1000000-0000-4000-8000-000000000001', 'Adobe CC', NULL, 59, 'EUR', 'monthly', 12, '2025-01-01', NULL, '2026-04-01', true, true, now());
-- DE
INSERT INTO recurring_rules (id, company_id, creditor_id, debt_category_id, title, template_description, amount, currency_code, frequency, day_of_month, start_date, end_date, next_run_date, auto_generate, is_active, created_at) VALUES
  ('9d000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'Miete Berlin', NULL, 4200, 'EUR', 'monthly', 10, '2025-01-01', NULL, '2026-04-01', true, true, now()),
  ('9d000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000002', 'Gehalt Hans', NULL, 4500, 'EUR', 'monthly', 28, '2025-01-01', NULL, '2026-04-01', true, true, now());
-- UK
INSERT INTO recurring_rules (id, company_id, creditor_id, debt_category_id, title, template_description, amount, currency_code, frequency, day_of_month, start_date, end_date, next_run_date, auto_generate, is_active, created_at) VALUES
  ('9e000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'f3000000-0000-4000-8000-000000000001', 'e3000000-0000-4000-8000-000000000001', 'Rent London', NULL, 2800, 'GBP', 'monthly', 25, '2025-01-01', NULL, '2026-04-01', true, true, now()),
  ('9e000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'f3000000-0000-4000-8000-000000000002', 'e3000000-0000-4000-8000-000000000001', 'Salary John', NULL, 3500, 'GBP', 'monthly', 28, '2025-01-01', NULL, '2026-04-01', true, true, now());

-- =============================================================================
-- 12. TAUX DE CHANGE (prévision groupe multi-devises)
-- =============================================================================
INSERT INTO exchange_rates (from_currency, to_currency, rate, rate_date, created_at) VALUES
  ('EUR', 'EUR', 1, CURRENT_DATE, now()),
  ('GBP', 'EUR', 1.17, CURRENT_DATE, now()),
  ('USD', 'EUR', 0.92, CURRENT_DATE, now()),
  ('EUR', 'GBP', 0.855, CURRENT_DATE, now()),
  ('EUR', 'USD', 1.087, CURRENT_DATE, now());

-- =============================================================================
-- FIN DU SEED — Puis exécuter : UPDATE memberships SET user_id = 'VOTRE_UUID_AUTH' WHERE user_id = '00000000-0000-0000-0000-000000000001';
-- =============================================================================
-- 1) Remplacez VOTRE_USER_ID_AUTH dans l’INSERT memberships par l’UUID de votre
--    utilisateur (Supabase > Authentication > Users).
-- 2) Si vous utilisez users_profile, insérez une ligne pour cet user_id.
-- 3) Réexécutez uniquement l’INSERT INTO memberships après remplacement.