/**
 * Basic payment validation tests.
 * Run with: npx vitest run tests/payment-validation.test.ts
 * Or add vitest to devDependencies and configure.
 *
 * For minimal setup without vitest, run: node --experimental-vm-modules node_modules/vitest/vitest.mjs run tests/
 */
import { describe, it, expect } from 'vitest'
import { paymentSchema } from '../src/modules/payments/schema'
import { receiveRevenueSchema } from '../src/modules/revenues/schema'

describe('payment validation', () => {
  it('rejects zero amount', () => {
    const result = paymentSchema.safeParse({
      debt_id: 'a0000000-0000-4000-8000-000000000001',
      account_id: 'b0000000-0000-4000-8000-000000000001',
      amount: 0,
      currency_code: 'EUR',
      payment_date: '2026-03-16',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = paymentSchema.safeParse({
      debt_id: 'a0000000-0000-4000-8000-000000000001',
      account_id: 'b0000000-0000-4000-8000-000000000001',
      amount: -100,
      currency_code: 'EUR',
      payment_date: '2026-03-16',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid payment', () => {
    const result = paymentSchema.safeParse({
      debt_id: 'a0000000-0000-4000-8000-000000000001',
      account_id: 'b0000000-0000-4000-8000-000000000001',
      amount: 100.5,
      currency_code: 'EUR',
      payment_date: '2026-03-16',
    })
    expect(result.success).toBe(true)
  })
})

describe('receive revenue validation', () => {
  it('accepts valid receive', () => {
    const result = receiveRevenueSchema.safeParse({
      amount_received: 1000,
      received_date: '2026-03-16',
      account_id: 'a0000000-0000-4000-8000-000000000001',
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative amount_received', () => {
    const result = receiveRevenueSchema.safeParse({
      amount_received: -1,
      received_date: '2026-03-16',
      account_id: 'a0000000-0000-4000-8000-000000000001',
    })
    expect(result.success).toBe(false)
  })
})
