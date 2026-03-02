/** Unit tests for Zod validation schemas in lib/schemas.ts. */

import { describe, it, expect } from 'vitest'
import {
  wholesaleSchema,
  buyAndHoldSchema,
  creativeFinanceSchema,
  flipSchema,
  brrrrSchema,
} from '@/lib/schemas'

describe('wholesaleSchema', () => {
  const validWholesale = {
    arv: 200000,
    repair_costs: 30000,
    desired_profit: 20000,
    holding_costs: 5000,
    closing_costs_pct: 3,
    asking_price: 120000,
  }

  it('accepts valid wholesale inputs', () => {
    const result = wholesaleSchema.safeParse(validWholesale)
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields with appropriate messages', () => {
    const result = wholesaleSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const fieldNames = result.error.issues.map((issue) => issue.path[0])
      expect(fieldNames).toContain('arv')
      expect(fieldNames).toContain('repair_costs')
      expect(fieldNames).toContain('desired_profit')
    }
  })

  it('rejects negative values for positive-only fields', () => {
    const result = wholesaleSchema.safeParse({ ...validWholesale, arv: -100 })
    expect(result.success).toBe(false)
  })

  it('rejects closing_costs_pct above 100', () => {
    const result = wholesaleSchema.safeParse({ ...validWholesale, closing_costs_pct: 150 })
    expect(result.success).toBe(false)
  })
})

describe('buyAndHoldSchema', () => {
  const validBuyAndHold = {
    purchase_price: 250000,
    down_payment_pct: 20,
    interest_rate: 6.5,
    loan_term_years: 30 as const,
    monthly_rent: 2000,
    monthly_taxes: 250,
    monthly_insurance: 100,
    vacancy_rate_pct: 8,
    maintenance_pct: 5,
    mgmt_fee_pct: 10,
  }

  it('accepts valid buy-and-hold inputs with monthly rent', () => {
    const result = buyAndHoldSchema.safeParse(validBuyAndHold)
    expect(result.success).toBe(true)
  })

  it('rejects purchase_price below minimum', () => {
    const result = buyAndHoldSchema.safeParse({ ...validBuyAndHold, purchase_price: 5000 })
    expect(result.success).toBe(false)
  })

  it('rejects loan_term_years that is not 15 or 30', () => {
    const result = buyAndHoldSchema.safeParse({ ...validBuyAndHold, loan_term_years: 20 })
    expect(result.success).toBe(false)
  })
})

describe('creativeFinanceSchema', () => {
  const validCreative = {
    existing_loan_balance: 180000,
    existing_interest_rate: 4.5,
    monthly_piti: 1200,
    monthly_rent_estimate: 2500,
    monthly_expenses: 400,
    finance_type: 'subject_to' as const,
    new_rate: 5.0,
    new_term_years: 30,
    arv: 250000,
  }

  it('accepts valid creative finance inputs with seller terms', () => {
    const result = creativeFinanceSchema.safeParse(validCreative)
    expect(result.success).toBe(true)
  })

  it('accepts seller_finance as finance_type', () => {
    const result = creativeFinanceSchema.safeParse({
      ...validCreative,
      finance_type: 'seller_finance',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid finance_type values', () => {
    const result = creativeFinanceSchema.safeParse({
      ...validCreative,
      finance_type: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('flipSchema', () => {
  it('accepts valid flip inputs', () => {
    const result = flipSchema.safeParse({
      purchase_price: 150000,
      rehab_budget: 40000,
      arv: 250000,
      holding_months: 6,
      selling_costs_pct: 8,
      financing_costs: 5000,
    })
    expect(result.success).toBe(true)
  })
})

describe('brrrrSchema', () => {
  it('rejects zero purchase_price (below minimum of 1000)', () => {
    const result = brrrrSchema.safeParse({
      purchase_price: 0,
      rehab_costs: 20000,
      arv_post_rehab: 180000,
      refinance_ltv_pct: 75,
      new_loan_rate: 6.5,
      new_loan_term_years: 30,
      monthly_rent: 1500,
      monthly_expenses: 600,
    })
    expect(result.success).toBe(false)
  })
})
