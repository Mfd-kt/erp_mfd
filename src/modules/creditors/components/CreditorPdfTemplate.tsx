import type { Company, Creditor, DebtPriority, DebtStatus } from '@/lib/supabase/types'
import { creditorCountryDisplay, getCreditorCompanyLines } from '@/modules/creditors/creditor-company-lines'
import type { DebtRow } from '@/modules/debts/queries'
import type { PaymentRow } from '@/modules/payments/queries'
import { creditorPdfDomIds } from '@/lib/creditor-print-pdf'

const creditorTypeLabel: Record<string, string> = {
  person: 'Personne',
  company: 'Société',
  employee: 'Employé',
  government: 'Gouvernement',
  landlord: 'Propriétaire',
  bank: 'Banque',
  other: 'Autre',
}

const statusLabel: Record<DebtStatus, string> = {
  draft: 'Brouillon',
  open: 'Ouverte',
  partially_paid: 'Partiel',
  paid: 'Payée',
  cancelled: 'Annulée',
  overdue: 'En retard',
}

const priorityLabel: Record<DebtPriority, string> = {
  critical: 'Critique',
  high: 'Haute',
  normal: 'Normale',
  low: 'Basse',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Virement',
  cash: 'Espèces',
  card: 'Carte',
  check: 'Chèque',
  other: 'Autre',
}

/** Gabarit dense ; le cadre A4 (794×1122 px) est sur le conteneur de capture. */
const L = {
  radius: 8,
  headerPad: 12,
  headerMb: 10,
  kicker: 8,
  brand: 20,
  meta: 11,
  dividerMy: 10,
  creditorL: 8,
  creditorN: 15,
  date: 11,
  kpiGap: 8,
  kpiPad: 10,
  kpiL: 8,
  kpiV: 15,
  secMb: 8,
  secTitle: 12,
  secSub: 10,
  secTitleMb: 6,
  coordPad: 12,
  coordFont: 11,
  fieldL: 9,
  table: 8,
  th: 7,
  cellV: 5,
  cellH: 5,
  pill: 7,
  emptyPad: 10,
  emptyFont: 11,
} as const

const hex = {
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  muted: '#6b7280',
  label: '#4b5563',
  paid: '#047857',
  due: '#b91c1c',
  neutral: '#111827',
  overdueBg: '#fef2f2',
  theadBg: '#f9fafb',
  sectionTitle: '#1e3a5f',
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR')
}

function formatPaymentDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR')
}

interface CreditorPdfTemplateProps {
  company: Company
  creditor: Creditor
  debts: DebtRow[]
  payments: PaymentRow[]
  currency: string
}

/**
 * Gabarit document (A4) : couleurs hex / inline pour html2canvas.
 * Pensé pour être mis à l’échelle sur **une seule page** PDF (voir creditor-pdf-single-page).
 */
export function CreditorPdfTemplate({ company, creditor, debts, payments, currency }: CreditorPdfTemplateProps) {
  const companyDisplay = company.trade_name ?? company.legal_name
  const totalAmount = debts.reduce((s, d) => s + Number(d.amount_company_currency), 0)
  const totalPaid = debts.reduce((s, d) => s + Number(d.paid_company_currency ?? 0), 0)
  const totalRemaining = debts.reduce((s, d) => s + Number(d.remaining_company_currency), 0)
  const edited = new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' })

  const metaLine = [
    company.legal_name !== companyDisplay ? company.legal_name : null,
    `Pays ${company.country_code}`,
    `Devise ${company.default_currency}`,
  ]
    .filter(Boolean)
    .join(' · ')

  const cellPad = `${L.cellV}px ${L.cellH}px`

  return (
    <div
      className="pdf-doc-inner"
      style={{
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        color: hex.text,
        backgroundColor: 'transparent',
        padding: 0,
        boxSizing: 'border-box',
        width: '100%',
        margin: 0,
      }}
    >
      <header
        style={{
          backgroundColor: hex.card,
          border: `1px solid ${hex.border}`,
          borderRadius: `${L.radius}px`,
          padding: `${L.headerPad}px ${L.headerPad + 4}px`,
          marginBottom: `${L.headerMb}px`,
        }}
      >
        <p
          style={{
            fontSize: `${L.kicker}px`,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: hex.muted,
            margin: `0 0 8px 0`,
            fontWeight: 600,
          }}
        >
          État créancier — ERP financier
        </p>
        <h1
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: `${L.brand}px`,
            fontWeight: 700,
            color: hex.sectionTitle,
            margin: '0 0 6px 0',
            lineHeight: 1.15,
          }}
        >
          {companyDisplay}
        </h1>
        <p style={{ fontSize: `${L.meta}px`, color: hex.label, margin: '0 0 12px 0' }}>{metaLine}</p>
        <div style={{ height: '1px', backgroundColor: hex.border, margin: `${L.dividerMy}px 0` }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '10px' }}>
          <div>
            <p
              style={{
                fontSize: `${L.creditorL}px`,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: hex.muted,
                margin: '0 0 2px 0',
              }}
            >
              Créancier
            </p>
            <p style={{ fontSize: `${L.creditorN}px`, fontWeight: 600, color: hex.text, margin: 0 }}>{creditor.name}</p>
            {creditor.creditor_type === 'company' && getCreditorCompanyLines(creditor).length > 0 ? (
              <div style={{ marginTop: '10px', maxWidth: '420px' }}>
                {getCreditorCompanyLines(creditor).map((line, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: `${L.meta}px`,
                      color: hex.label,
                      margin: i === 0 ? '0 0 2px 0' : '0 0 2px 0',
                      lineHeight: 1.45,
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
          <p style={{ fontSize: `${L.date}px`, color: hex.muted, margin: 0 }}>Document édité le {edited}</p>
        </div>
      </header>

      <div
        id={creditorPdfDomIds.metrics}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: `${L.kpiGap}px`,
          marginBottom: `${L.secMb}px`,
        }}
      >
        <PdfKpiCard label="Encours (montants initiaux)" value={formatCurrency(totalAmount, currency)} valueColor={hex.neutral} />
        <PdfKpiCard label="Total payé" value={formatCurrency(totalPaid, currency)} valueColor={hex.paid} />
        <PdfKpiCard label="Restant dû" value={formatCurrency(totalRemaining, currency)} valueColor={hex.due} />
      </div>

      <section style={{ marginBottom: `${L.secMb}px` }}>
        <PdfSectionTitle title="Coordonnées" subtitle="Informations du référentiel créanciers." />
        <div
          style={{
            backgroundColor: hex.card,
            border: `1px solid ${hex.border}`,
            borderRadius: `${L.radius}px`,
            padding: `${L.coordPad}px`,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '10px 16px',
              fontSize: `${L.coordFont}px`,
            }}
          >
            <PdfField label="Type" value={creditorTypeLabel[creditor.creditor_type] ?? creditor.creditor_type} />
            <PdfField label="Pays (code)" value={creditor.country_code ?? '—'} />
            <PdfField label="Email" value={creditor.email ?? '—'} />
            <PdfField label="Téléphone" value={creditor.phone ?? '—'} />
            {creditor.creditor_type === 'company' ? (
              <>
                <PdfField label="Immatriculation" value={creditor.company_registration ?? '—'} />
                <PdfField label="Adresse" value={creditor.address_street ?? '—'} />
                <PdfField label="Code postal" value={creditor.address_postal_code ?? '—'} />
                <PdfField label="Ville" value={creditor.address_city ?? '—'} />
                <PdfField label="Pays (libellé)" value={creditorCountryDisplay(creditor)} />
              </>
            ) : null}
            {creditor.notes ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <p
                  style={{
                    fontSize: `${L.fieldL}px`,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: hex.muted,
                    margin: '0 0 4px 0',
                  }}
                >
                  Notes
                </p>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: hex.text, fontSize: `${L.coordFont}px` }}>{creditor.notes}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: `${L.secMb}px` }}>
        <PdfSectionTitle title="Dettes" subtitle="Détail des obligations liées à ce créancier." />
        <div style={{ backgroundColor: hex.card, border: `1px solid ${hex.border}`, borderRadius: `${L.radius}px`, overflow: 'hidden' }}>
          {debts.length === 0 ? (
            <p style={{ padding: `${L.emptyPad}px`, margin: 0, color: hex.muted, fontSize: `${L.emptyFont}px` }}>Aucune dette enregistrée.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${L.table}px`, tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ backgroundColor: hex.theadBg }}>
                  {['Titre', 'Catégorie', 'Montant', 'Restant', 'Échéance', 'Priorité', 'Statut'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: h === 'Montant' || h === 'Restant' ? 'right' : 'left',
                        padding: cellPad,
                        fontSize: `${L.th}px`,
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: hex.muted,
                        borderBottom: `1px solid ${hex.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {debts.map((debt) => {
                  const status = debt.computed_status as DebtStatus
                  const priority = debt.priority as DebtPriority
                  const isPaid = status === 'paid' || status === 'cancelled'
                  const isOverdue = status === 'overdue' && !isPaid
                  const rowBg = isOverdue ? hex.overdueBg : hex.card
                  return (
                    <tr key={debt.id} style={{ backgroundColor: rowBg }}>
                      <td style={{ padding: cellPad, borderBottom: `1px solid ${hex.border}`, wordBreak: 'break-word', color: isPaid ? hex.muted : hex.text }}>
                        {debt.title}
                      </td>
                      <td style={{ padding: cellPad, borderBottom: `1px solid ${hex.border}`, color: hex.label }}>{debt.debt_categories?.name ?? '—'}</td>
                      <td style={{ padding: cellPad, borderBottom: `1px solid ${hex.border}`, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(debt.amount_company_currency, currency)}
                      </td>
                      <td style={{ padding: cellPad, borderBottom: `1px solid ${hex.border}`, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(Number(debt.remaining_company_currency), currency)}
                      </td>
                      <td style={{ padding: cellPad, borderBottom: `1px solid ${hex.border}`, color: isOverdue ? hex.due : hex.text }}>{formatDate(debt.due_date)}</td>
                      <td style={{ padding: cellPad, borderBottom: `1px solid ${hex.border}` }}>
                        <PdfPill
                          text={priorityLabel[priority as DebtPriority] ?? String(debt.priority)}
                          variant={priority === 'critical' ? 'danger' : 'neutral'}
                        />
                      </td>
                      <td style={{ padding: cellPad, borderBottom: `1px solid ${hex.border}` }}>
                        <PdfPill
                          text={statusLabel[status as DebtStatus] ?? String(debt.computed_status)}
                          variant={status === 'overdue' ? 'danger' : status === 'paid' ? 'success' : 'neutral'}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <PdfSectionTitle title="Paiements" subtitle="Règlements enregistrés sur les dettes de ce créancier." />
        <div style={{ backgroundColor: hex.card, border: `1px solid ${hex.border}`, borderRadius: `${L.radius}px`, overflow: 'hidden' }}>
          {payments.length === 0 ? (
            <p style={{ padding: `${L.emptyPad}px`, margin: 0, color: hex.muted, fontSize: `${L.emptyFont}px` }}>Aucun paiement enregistré.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${L.table}px`, tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ backgroundColor: hex.theadBg }}>
                  {['Dette', 'Date', 'Compte', 'Montant', 'Moyen', 'Réf.', 'Notes'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: h === 'Montant' ? 'right' : 'left',
                        padding: cellPad,
                        fontSize: `${L.th}px`,
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: hex.muted,
                        borderBottom: `1px solid ${hex.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ backgroundColor: hex.card }}>
                    <td style={{ padding: cellPad, borderBottom: `1px solid ${hex.border}`, wordBreak: 'break-word' }}>{p.debts?.title ?? p.debt?.title ?? '—'}</td>
                    <td style={{ padding: cellPad, borderBottom: `1px solid ${hex.border}` }}>{formatPaymentDate(p.payment_date)}</td>
                    <td style={{ padding: cellPad, borderBottom: `1px solid ${hex.border}`, color: hex.label }}>{p.accounts?.name ?? p.account?.name ?? '—'}</td>
                    <td style={{ padding: cellPad, borderBottom: `1px solid ${hex.border}`, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {formatCurrency(p.amount_company_currency, currency)}
                    </td>
                    <td style={{ padding: cellPad, borderBottom: `1px solid ${hex.border}` }}>{PAYMENT_METHOD_LABELS[p.payment_method ?? ''] ?? p.payment_method ?? '—'}</td>
                    <td style={{ padding: cellPad, borderBottom: `1px solid ${hex.border}`, color: hex.label }}>{p.reference ?? '—'}</td>
                    <td style={{ padding: cellPad, borderBottom: `1px solid ${hex.border}`, color: hex.muted, wordBreak: 'break-word' }}>{p.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}

function PdfKpiCard({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div
      style={{
        backgroundColor: hex.card,
        border: `1px solid ${hex.border}`,
        borderRadius: `${L.radius}px`,
        padding: `${L.kpiPad}px`,
      }}
    >
      <p
        style={{
          fontSize: `${L.kpiL}px`,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: hex.muted,
          margin: '0 0 6px 0',
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: `${L.kpiV}px`, fontWeight: 700, margin: 0, color: valueColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{value}</p>
    </div>
  )
}

function PdfSectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: `${L.secTitleMb}px` }}>
      <h2 style={{ fontSize: `${L.secTitle}px`, fontWeight: 700, color: hex.sectionTitle, margin: '0 0 2px 0', letterSpacing: '-0.02em' }}>{title}</h2>
      <p style={{ fontSize: `${L.secSub}px`, color: hex.muted, margin: 0 }}>{subtitle}</p>
    </div>
  )
}

function PdfField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: `${L.fieldL}px`, letterSpacing: '0.1em', textTransform: 'uppercase', color: hex.muted, margin: '0 0 3px 0' }}>{label}</p>
      <p style={{ margin: 0, color: hex.text, fontSize: `${L.coordFont}px` }}>{value}</p>
    </div>
  )
}

function PdfPill({ text, variant }: { text: string; variant: 'neutral' | 'danger' | 'success' }) {
  const bg = variant === 'danger' ? '#fef2f2' : variant === 'success' ? '#ecfdf5' : '#f9fafb'
  const fg = variant === 'danger' ? '#991b1b' : variant === 'success' ? '#047857' : '#374151'
  const border = variant === 'danger' ? '#fecaca' : variant === 'success' ? '#a7f3d0' : '#e5e7eb'
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: `${L.pill}px`,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: '999px',
        backgroundColor: bg,
        color: fg,
        border: `1px solid ${border}`,
      }}
    >
      {text}
    </span>
  )
}
