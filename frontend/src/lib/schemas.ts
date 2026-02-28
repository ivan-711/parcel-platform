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
