-- Réconciliation manuelle du solde affiché + vue accounts_with_balance explicite.
-- computed_balance = ouverture + encaissements sur le compte − paiements depuis le compte + balance_reconciliation

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS balance_reconciliation numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN accounts.balance_reconciliation IS 'Ajustement manuel pour aligner le solde affiché sur la banque (réconciliation).';

DROP VIEW IF EXISTS accounts_with_balance;

CREATE VIEW accounts_with_balance AS
SELECT
  a.id,
  a.company_id,
  a.name,
  a.account_type,
  a.currency_code,
  a.opening_balance,
  a.current_balance_cached,
  a.balance_reconciliation,
  a.is_active,
  a.created_at,
  (
    COALESCE(a.opening_balance, 0)::numeric
    + COALESCE((
        SELECT SUM(COALESCE(r.amount_received, 0))::numeric
        FROM revenues r
        WHERE r.account_id = a.id
      ), 0)
    - COALESCE((
        SELECT SUM(COALESCE(p.amount_company_currency, 0))::numeric
        FROM payments p
        WHERE p.account_id = a.id
      ), 0)
    + COALESCE(a.balance_reconciliation, 0)
  ) AS computed_balance
FROM accounts a;

COMMENT ON VIEW accounts_with_balance IS 'Soldes avec flux (revenus encaissés sur le compte − paiements) + ajustement de réconciliation.';
