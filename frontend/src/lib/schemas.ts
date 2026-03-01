/** Zod validation schemas for deal analyzer forms. */

import { z } from 'zod'

export const wholesaleSchema = z.object({
  arv: z.number({ message: 'ARV is required' }).positive('ARV must be greater than 0'),
  repair_costs: z.number({ message: 'Repair costs are required' }).positive('Repair costs must be greater than 0'),
  desired_profit: z.number({ message: 'Desired profit is required' }).positive('Desired profit must be greater than 0'),
  holding_costs: z.number({ message: 'Holding costs are required' }).positive('Holding costs must be greater than 0'),
  closing_costs_pct: z
    .number({ message: 'Closing costs are required' })
    .positive('Closing costs must be greater than 0')
    .max(100, 'Closing costs cannot exceed 100%'),
  asking_price: z.number({ message: 'Asking price is required' }).positive('Asking price must be greater than 0'),
})

export type WholesaleFormValues = z.infer<typeof wholesaleSchema>

export const buyAndHoldSchema = z.object({
  purchase_price: z.number({ message: 'Purchase price is required' }).min(10000, 'Min $10,000'),
  down_payment_pct: z.number({ message: 'Down payment is required' }).min(0).max(100),
  interest_rate: z.number({ message: 'Interest rate is required' }).min(0.1).max(25),
  loan_term_years: z.union([z.literal(15), z.literal(30)], { message: 'Must be 15 or 30' }),
  monthly_rent: z.number({ message: 'Monthly rent is required' }).min(100, 'Min $100'),
  monthly_taxes: z.number({ message: 'Monthly taxes are required' }).min(0),
  monthly_insurance: z.number({ message: 'Monthly insurance is required' }).min(0),
  vacancy_rate_pct: z.number({ message: 'Vacancy rate is required' }).min(0).max(50),
  maintenance_pct: z.number({ message: 'Maintenance reserve is required' }).min(0).max(30),
  mgmt_fee_pct: z.number({ message: 'Management fee is required' }).min(0).max(20),
})

export type BuyAndHoldFormValues = z.infer<typeof buyAndHoldSchema>

export const flipSchema = z.object({
  purchase_price: z.number({ message: 'Purchase price is required' }).min(10000),
  rehab_budget: z.number({ message: 'Rehab budget is required' }).min(0),
  arv: z.number({ message: 'ARV is required' }).min(10000),
  holding_months: z.number({ message: 'Holding period is required' }).min(1).max(36),
  selling_costs_pct: z.number({ message: 'Selling costs required' }).min(0).max(20),
  financing_costs: z.number({ message: 'Financing costs required' }).min(0),
})

export type FlipFormValues = z.infer<typeof flipSchema>
