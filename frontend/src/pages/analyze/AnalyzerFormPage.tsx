/** Deal analyzer form page — strategy-aware form for wholesale and buy & hold, coming soon for others. */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { ConceptTooltip } from '@/components/ui/ConceptTooltip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  wholesaleSchema,
  buyAndHoldSchema,
  flipSchema,
  brrrrSchema,
  creativeFinanceSchema,
  type WholesaleFormValues,
  type BuyAndHoldFormValues,
  type FlipFormValues,
  type BRRRRFormValues,
  type CreativeFinanceFormValues,
} from '@/lib/schemas'
import { useShake } from '@/lib/motion'
import { useCreateDeal } from '@/hooks/useDeals'
import type { Strategy } from '@/types'

const VALID_STRATEGIES: Strategy[] = ['wholesale', 'creative_finance', 'brrrr', 'buy_and_hold', 'flip']
const ENABLED_STRATEGIES: Strategy[] = ['wholesale', 'buy_and_hold', 'flip', 'brrrr', 'creative_finance']

interface FieldConfig<T extends string> {
  name: T
  label: string
  adornment: 'dollar' | 'percent' | 'none'
  tooltip: string
}

const WHOLESALE_FIELDS: FieldConfig<keyof WholesaleFormValues>[] = [
  {
    name: 'arv',
    label: 'After Repair Value (ARV)',
    adornment: 'dollar',
    tooltip: 'The estimated market value of the property after all repairs are complete.',
  },
  {
    name: 'repair_costs',
    label: 'Repair Costs',
    adornment: 'dollar',
    tooltip: 'Total estimated cost to rehab the property to ARV condition.',
  },
  {
    name: 'desired_profit',
    label: 'Desired Wholesale Fee / Profit',
    adornment: 'dollar',
    tooltip: 'The minimum profit you need to make this deal worth pursuing.',
  },
  {
    name: 'holding_costs',
    label: 'Holding Costs',
    adornment: 'dollar',
    tooltip: 'Monthly costs to hold the property (taxes, insurance, utilities) multiplied by expected hold time.',
  },
  {
    name: 'closing_costs_pct',
    label: 'Closing Costs (%)',
    adornment: 'percent',
    tooltip: 'Estimated closing costs as a percentage of ARV. Typically 2–4%.',
  },
  {
    name: 'asking_price',
    label: "Seller's Asking Price",
    adornment: 'dollar',
    tooltip: 'The price the seller is currently asking for the property.',
  },
]

/** Buy & Hold fields excluding loan_term_years (rendered as a toggle). */
const BUY_AND_HOLD_FIELDS: FieldConfig<Exclude<keyof BuyAndHoldFormValues, 'loan_term_years'>>[] = [
  {
    name: 'purchase_price',
    label: 'Purchase Price',
    adornment: 'dollar',
    tooltip: 'The total purchase price of the property.',
  },
  {
    name: 'down_payment_pct',
    label: 'Down Payment (%)',
    adornment: 'percent',
    tooltip: 'Down payment as a percentage of purchase price. Typical investment property: 20–25%.',
  },
  {
    name: 'interest_rate',
    label: 'Interest Rate (%)',
    adornment: 'percent',
    tooltip: 'Annual mortgage interest rate.',
  },
  {
    name: 'monthly_rent',
    label: 'Monthly Rent',
    adornment: 'dollar',
    tooltip: 'Expected gross monthly rental income.',
  },
  {
    name: 'monthly_taxes',
    label: 'Monthly Taxes',
    adornment: 'dollar',
    tooltip: 'Monthly property tax amount.',
  },
  {
    name: 'monthly_insurance',
    label: 'Monthly Insurance',
    adornment: 'dollar',
    tooltip: 'Monthly property insurance premium.',
  },
  {
    name: 'vacancy_rate_pct',
    label: 'Vacancy Rate (%)',
    adornment: 'percent',
    tooltip: 'Expected percentage of time the property is vacant. Typical: 5–10%.',
  },
  {
    name: 'maintenance_pct',
    label: 'Maintenance Reserve (%)',
    adornment: 'percent',
    tooltip: 'Percentage of rent set aside for repairs and maintenance. Typical: 5–10%.',
  },
  {
    name: 'mgmt_fee_pct',
    label: 'Management Fee (%)',
    adornment: 'percent',
    tooltip: 'Property management fee as percentage of rent. Typical: 8–10%.',
  },
]

const STRATEGY_LABELS: Record<string, string> = {
  wholesale: 'Wholesale Analyzer',
  buy_and_hold: 'Buy & Hold Analyzer',
  flip: 'Flip Analyzer',
  brrrr: 'BRRRR Analyzer',
  creative_finance: 'Creative Finance Analyzer',
}

const STRATEGY_DISPLAY_NAMES: Record<string, string> = {
  wholesale: 'Wholesale',
  buy_and_hold: 'Buy & Hold',
  flip: 'Flip',
  brrrr: 'BRRRR',
  creative_finance: 'Creative Finance',
}

/** Wholesale strategy form. */
function WholesaleForm() {
  const createDeal = useCreateDeal()
  const { triggerShake, shakeProps } = useShake()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WholesaleFormValues>({
    resolver: zodResolver(wholesaleSchema),
  })

  const onSubmit = (values: WholesaleFormValues) => {
    const { address, zip_code, ...rest } = values
    const inputs = Object.fromEntries(
      Object.entries(rest).map(([k, v]) => [k, Number(v)])
    )
    createDeal.mutate({
      address,
      zip_code,
      property_type: 'single_family',
      strategy: 'wholesale',
      inputs,
    })
  }

  return (
    <motion.div {...shakeProps} className="relative rounded-xl border border-gray-200 bg-white shadow-xs p-6">
      {createDeal.isPending && (
        <div className="absolute inset-0 rounded-xl bg-white/80 z-10 flex items-center justify-center">
          <div className="h-full w-full animate-pulse rounded-xl bg-gray-100/50" />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, triggerShake)} className="space-y-6">
        {/* Property Info */}
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-gray-600">Property Address</Label>
            <Input
              id="address"
              placeholder="123 Main St, City, State"
              className={`bg-white border-gray-300 text-gray-900 ${errors.address ? 'border-red-500' : ''}`}
              {...register('address')}
            />
            {errors.address && <p className="text-red-600 text-xs">{errors.address.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zip_code" className="text-gray-600">Zip Code</Label>
            <Input
              id="zip_code"
              placeholder="00000"
              maxLength={5}
              className={`tabular-nums bg-white border-gray-300 text-gray-900 w-32 ${errors.zip_code ? 'border-red-500' : ''}`}
              {...register('zip_code')}
            />
            {errors.zip_code && <p className="text-red-600 text-xs">{errors.zip_code.message}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          {WHOLESALE_FIELDS.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={field.name} className="text-gray-600">
                <ConceptTooltip term={field.label} definition={field.tooltip}>
                  {field.label}
                </ConceptTooltip>
              </Label>
              <div className="relative">
                {field.adornment === 'dollar' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">
                    $
                  </span>
                )}
                <Input
                  id={field.name}
                  type="number"
                  step="any"
                  min={0}
                  placeholder="0"
                  className={`tabular-nums bg-white border-gray-300 text-gray-900 ${
                    field.adornment === 'dollar' ? 'pl-7' : 'pr-8'
                  } ${errors[field.name] ? 'border-red-500' : ''}`}
                  {...register(field.name, { valueAsNumber: true })}
                />
                {field.adornment === 'percent' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">
                    %
                  </span>
                )}
              </div>
              {errors[field.name] && (
                <p className="text-red-600 text-xs">{errors[field.name]?.message}</p>
              )}
            </div>
          ))}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={createDeal.isPending}
            className="w-full bg-lime-700 hover:bg-lime-800 text-white"
          >
            {createDeal.isPending ? 'Calculating...' : 'Analyze Deal'}
          </Button>
          {createDeal.isError && (
            <p className="text-red-600 text-sm mt-2">
              {createDeal.error?.message ?? 'Something went wrong. Please try again.'}
            </p>
          )}
        </div>
      </form>
    </motion.div>
  )
}

/** Buy & Hold strategy form. */
function BuyAndHoldForm() {
  const createDeal = useCreateDeal()
  const { triggerShake, shakeProps } = useShake()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BuyAndHoldFormValues>({
    resolver: zodResolver(buyAndHoldSchema),
    defaultValues: {
      loan_term_years: 30,
      vacancy_rate_pct: 8,
      maintenance_pct: 5,
      mgmt_fee_pct: 8,
    },
  })

  const onSubmit = (values: BuyAndHoldFormValues) => {
    const { address, zip_code, ...rest } = values
    const inputs = Object.fromEntries(
      Object.entries(rest).map(([k, v]) => [k, Number(v)])
    )
    createDeal.mutate({
      address,
      zip_code,
      property_type: 'single_family',
      strategy: 'buy_and_hold',
      inputs,
    })
  }

  return (
    <motion.div {...shakeProps} className="relative rounded-xl border border-gray-200 bg-white shadow-xs p-6">
      {createDeal.isPending && (
        <div className="absolute inset-0 rounded-xl bg-white/80 z-10 flex items-center justify-center">
          <div className="h-full w-full animate-pulse rounded-xl bg-gray-100/50" />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, triggerShake)} className="space-y-6">
        {/* Property Info */}
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bh-address" className="text-gray-600">Property Address</Label>
            <Input
              id="bh-address"
              placeholder="123 Main St, City, State"
              className={`bg-white border-gray-300 text-gray-900 ${errors.address ? 'border-red-500' : ''}`}
              {...register('address')}
            />
            {errors.address && <p className="text-red-600 text-xs">{errors.address.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bh-zip" className="text-gray-600">Zip Code</Label>
            <Input
              id="bh-zip"
              placeholder="00000"
              maxLength={5}
              className={`tabular-nums bg-white border-gray-300 text-gray-900 w-32 ${errors.zip_code ? 'border-red-500' : ''}`}
              {...register('zip_code')}
            />
            {errors.zip_code && <p className="text-red-600 text-xs">{errors.zip_code.message}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          {BUY_AND_HOLD_FIELDS.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={field.name} className="text-gray-600">
                <ConceptTooltip term={field.label} definition={field.tooltip}>
                  {field.label}
                </ConceptTooltip>
              </Label>
              <div className="relative">
                {field.adornment === 'dollar' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">
                    $
                  </span>
                )}
                <Input
                  id={field.name}
                  type="number"
                  step="any"
                  min={0}
                  placeholder="0"
                  className={`tabular-nums bg-white border-gray-300 text-gray-900 ${
                    field.adornment === 'dollar' ? 'pl-7' : 'pr-8'
                  } ${errors[field.name] ? 'border-red-500' : ''}`}
                  {...register(field.name, { valueAsNumber: true })}
                />
                {field.adornment === 'percent' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">
                    %
                  </span>
                )}
              </div>
              {errors[field.name] && (
                <p className="text-red-600 text-xs">{errors[field.name]?.message}</p>
              )}
            </div>
          ))}
        </div>

        {/* Loan Term Toggle — full width */}
        <div className="space-y-1.5">
          <Label className="text-gray-600">
            <ConceptTooltip
              term="Loan Term"
              definition="The length of the mortgage. 30-year has lower payments; 15-year builds equity faster."
            >
              Loan Term
            </ConceptTooltip>
          </Label>
          <Controller
            name="loan_term_years"
            control={control}
            render={({ field }) => (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={field.value === 15 ? 'default' : 'outline'}
                  className={`flex-1 tabular-nums ${
                    field.value === 15
                      ? 'bg-lime-700 hover:bg-lime-800 text-white'
                      : 'border-gray-200 text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => field.onChange(15)}
                >
                  15 Years
                </Button>
                <Button
                  type="button"
                  variant={field.value === 30 ? 'default' : 'outline'}
                  className={`flex-1 tabular-nums ${
                    field.value === 30
                      ? 'bg-lime-700 hover:bg-lime-800 text-white'
                      : 'border-gray-200 text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => field.onChange(30)}
                >
                  30 Years
                </Button>
              </div>
            )}
          />
          {errors.loan_term_years && (
            <p className="text-red-600 text-xs">{errors.loan_term_years.message}</p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={createDeal.isPending}
            className="w-full bg-lime-700 hover:bg-lime-800 text-white"
          >
            {createDeal.isPending ? 'Calculating...' : 'Analyze Deal'}
          </Button>
          {createDeal.isError && (
            <p className="text-red-600 text-sm mt-2">
              {createDeal.error?.message ?? 'Something went wrong. Please try again.'}
            </p>
          )}
        </div>
      </form>
    </motion.div>
  )
}

const FLIP_FIELDS: FieldConfig<keyof FlipFormValues>[] = [
  {
    name: 'purchase_price',
    label: 'Purchase Price',
    adornment: 'dollar',
    tooltip: 'What you\'re paying to acquire the property before rehab.',
  },
  {
    name: 'rehab_budget',
    label: 'Rehab Budget',
    adornment: 'dollar',
    tooltip: 'Total estimated cost to renovate. Add 10-15% contingency to contractor bids.',
  },
  {
    name: 'arv',
    label: 'After Repair Value (ARV)',
    adornment: 'dollar',
    tooltip: 'What the property will sell for after renovations. Pull comps within 0.5 miles, same bed/bath, sold in last 90 days.',
  },
  {
    name: 'holding_months',
    label: 'Holding Period (Months)',
    adornment: 'none',
    tooltip: 'Purchase to sale closing. Include rehab time plus time on market.',
  },
  {
    name: 'selling_costs_pct',
    label: 'Selling Costs (% of ARV)',
    adornment: 'percent',
    tooltip: 'Agent commission + closing costs + staging. Typically 7-9% total.',
  },
  {
    name: 'financing_costs',
    label: 'Financing Costs ($)',
    adornment: 'dollar',
    tooltip: 'Hard money costs: origination points, interest, extension fees. Enter 0 if paying cash.',
  },
]

/** Flip strategy form. */
function FlipForm() {
  const createDeal = useCreateDeal()
  const { triggerShake, shakeProps } = useShake()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FlipFormValues>({
    resolver: zodResolver(flipSchema),
    defaultValues: {
      holding_months: 6,
      selling_costs_pct: 8,
      financing_costs: 0,
    },
  })

  const onSubmit = (values: FlipFormValues) => {
    const { address, zip_code, ...rest } = values
    const inputs = Object.fromEntries(
      Object.entries(rest).map(([k, v]) => [k, Number(v)])
    )
    createDeal.mutate({
      address,
      zip_code,
      property_type: 'single_family',
      strategy: 'flip',
      inputs,
    })
  }

  return (
    <motion.div {...shakeProps} className="relative rounded-xl border border-gray-200 bg-white shadow-xs p-6">
      {createDeal.isPending && (
        <div className="absolute inset-0 rounded-xl bg-white/80 z-10 flex items-center justify-center">
          <div className="h-full w-full animate-pulse rounded-xl bg-gray-100/50" />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, triggerShake)} className="space-y-6">
        {/* Property Info */}
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="flip-address" className="text-gray-600">Property Address</Label>
            <Input
              id="flip-address"
              placeholder="123 Main St, City, State"
              className={`bg-white border-gray-300 text-gray-900 ${errors.address ? 'border-red-500' : ''}`}
              {...register('address')}
            />
            {errors.address && <p className="text-red-600 text-xs">{errors.address.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flip-zip" className="text-gray-600">Zip Code</Label>
            <Input
              id="flip-zip"
              placeholder="00000"
              maxLength={5}
              className={`tabular-nums bg-white border-gray-300 text-gray-900 w-32 ${errors.zip_code ? 'border-red-500' : ''}`}
              {...register('zip_code')}
            />
            {errors.zip_code && <p className="text-red-600 text-xs">{errors.zip_code.message}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          {FLIP_FIELDS.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={field.name} className="text-gray-600">
                <ConceptTooltip term={field.label} definition={field.tooltip}>
                  {field.label}
                </ConceptTooltip>
              </Label>
              <div className="relative">
                {field.adornment === 'dollar' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">
                    $
                  </span>
                )}
                <Input
                  id={field.name}
                  type="number"
                  step="any"
                  placeholder="0"
                  className={`tabular-nums bg-white border-gray-300 text-gray-900 ${
                    field.adornment === 'dollar' ? 'pl-7' : field.adornment === 'percent' ? 'pr-8' : ''
                  } ${errors[field.name] ? 'border-red-500' : ''}`}
                  {...register(field.name, { valueAsNumber: true })}
                />
                {field.adornment === 'percent' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">
                    %
                  </span>
                )}
              </div>
              {errors[field.name] && (
                <p className="text-red-600 text-xs">{errors[field.name]?.message}</p>
              )}
            </div>
          ))}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={createDeal.isPending}
            className="w-full bg-lime-700 hover:bg-lime-800 text-white"
          >
            {createDeal.isPending ? 'Calculating...' : 'Analyze Deal'}
          </Button>
          {createDeal.isError && (
            <p className="text-red-600 text-sm mt-2">
              {createDeal.error?.message ?? 'Something went wrong. Please try again.'}
            </p>
          )}
        </div>
      </form>
    </motion.div>
  )
}

/** BRRRR fields — excludes new_loan_term_years (rendered as a toggle). */
const BRRRR_FIELDS: FieldConfig<Exclude<keyof BRRRRFormValues, 'new_loan_term_years'>>[] = [
  {
    name: 'purchase_price',
    label: 'Purchase Price',
    adornment: 'dollar',
    tooltip: "What you're paying to acquire the property before rehab.",
  },
  {
    name: 'rehab_costs',
    label: 'Rehab Costs',
    adornment: 'dollar',
    tooltip: 'Total cost to renovate to rentable condition. Be conservative — add 15% contingency.',
  },
  {
    name: 'arv_post_rehab',
    label: 'ARV Post-Rehab',
    adornment: 'dollar',
    tooltip: "Appraised value after renovations — this is what you refinance against. Get a pre-rehab ARV estimate from a local appraiser.",
  },
  {
    name: 'refinance_ltv_pct',
    label: 'Refinance LTV (%)',
    adornment: 'percent',
    tooltip: 'Loan-to-value ratio on the cash-out refinance. Most lenders cap investment property refis at 75–80% LTV.',
  },
  {
    name: 'new_loan_rate',
    label: 'Refinance Interest Rate (%)',
    adornment: 'percent',
    tooltip: 'Interest rate on your refinance loan. Investment property refi rates are typically 0.5–1% higher than purchase rates.',
  },
  {
    name: 'monthly_rent',
    label: 'Monthly Rent',
    adornment: 'dollar',
    tooltip: 'Expected gross monthly rent at market rate.',
  },
  {
    name: 'monthly_expenses',
    label: 'Monthly Expenses (taxes + insurance + maintenance + mgmt)',
    adornment: 'dollar',
    tooltip: 'All monthly costs EXCLUDING your mortgage payment — property taxes, insurance, maintenance reserve, and property management fees combined.',
  },
]

/** BRRRR strategy form. */
function BRRRRForm() {
  const createDeal = useCreateDeal()
  const { triggerShake, shakeProps } = useShake()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BRRRRFormValues>({
    resolver: zodResolver(brrrrSchema),
    defaultValues: {
      new_loan_term_years: 30,
      refinance_ltv_pct: 75,
      new_loan_rate: 7.0,
    },
  })

  const onSubmit = (values: BRRRRFormValues) => {
    const { address, zip_code, ...rest } = values
    createDeal.mutate({
      address,
      zip_code,
      property_type: 'single_family',
      strategy: 'brrrr',
      inputs: {
        purchase_price: Number(rest.purchase_price),
        rehab_costs: Number(rest.rehab_costs),
        arv_post_rehab: Number(rest.arv_post_rehab),
        refinance_ltv_pct: Number(rest.refinance_ltv_pct),
        new_loan_rate: Number(rest.new_loan_rate),
        new_loan_term_years: Number(rest.new_loan_term_years),
        monthly_rent: Number(rest.monthly_rent),
        monthly_expenses: Number(rest.monthly_expenses),
      },
    })
  }

  return (
    <motion.div {...shakeProps} className="relative rounded-xl border border-gray-200 bg-white shadow-xs p-6">
      {createDeal.isPending && (
        <div className="absolute inset-0 rounded-xl bg-white/80 z-10 flex items-center justify-center">
          <div className="h-full w-full animate-pulse rounded-xl bg-gray-100/50" />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, triggerShake)} className="space-y-6">
        {/* Property Info */}
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="brrrr-address" className="text-gray-600">Property Address</Label>
            <Input
              id="brrrr-address"
              placeholder="123 Main St, City, State"
              className={`bg-white border-gray-300 text-gray-900 ${errors.address ? 'border-red-500' : ''}`}
              {...register('address')}
            />
            {errors.address && <p className="text-red-600 text-xs">{errors.address.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brrrr-zip" className="text-gray-600">Zip Code</Label>
            <Input
              id="brrrr-zip"
              placeholder="00000"
              maxLength={5}
              className={`tabular-nums bg-white border-gray-300 text-gray-900 w-32 ${errors.zip_code ? 'border-red-500' : ''}`}
              {...register('zip_code')}
            />
            {errors.zip_code && <p className="text-red-600 text-xs">{errors.zip_code.message}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          {BRRRR_FIELDS.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={field.name} className="text-gray-600">
                <ConceptTooltip term={field.label} definition={field.tooltip}>
                  {field.label}
                </ConceptTooltip>
              </Label>
              <div className="relative">
                {field.adornment === 'dollar' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">
                    $
                  </span>
                )}
                <Input
                  id={field.name}
                  type="number"
                  step="any"
                  placeholder="0"
                  className={`tabular-nums bg-white border-gray-300 text-gray-900 ${
                    field.adornment === 'dollar' ? 'pl-7' : field.adornment === 'percent' ? 'pr-8' : ''
                  } ${errors[field.name] ? 'border-red-500' : ''}`}
                  {...register(field.name, { valueAsNumber: true })}
                />
                {field.adornment === 'percent' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">
                    %
                  </span>
                )}
              </div>
              {errors[field.name] && (
                <p className="text-red-600 text-xs">{errors[field.name]?.message}</p>
              )}
            </div>
          ))}
        </div>

        {/* Loan Term Toggle — full width */}
        <div className="space-y-1.5">
          <Label className="text-gray-600">
            <ConceptTooltip
              term="Loan Term"
              definition="30-year maximizes cash flow, 15-year builds equity faster."
            >
              Loan Term (Years)
            </ConceptTooltip>
          </Label>
          <Controller
            name="new_loan_term_years"
            control={control}
            render={({ field }) => (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={field.value === 15 ? 'default' : 'outline'}
                  className={`flex-1 tabular-nums ${
                    field.value === 15
                      ? 'bg-lime-700 hover:bg-lime-800 text-white'
                      : 'border-gray-200 text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => field.onChange(15)}
                >
                  15 Years
                </Button>
                <Button
                  type="button"
                  variant={field.value === 30 ? 'default' : 'outline'}
                  className={`flex-1 tabular-nums ${
                    field.value === 30
                      ? 'bg-lime-700 hover:bg-lime-800 text-white'
                      : 'border-gray-200 text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => field.onChange(30)}
                >
                  30 Years
                </Button>
              </div>
            )}
          />
          {errors.new_loan_term_years && (
            <p className="text-red-600 text-xs">{errors.new_loan_term_years.message}</p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={createDeal.isPending}
            className="w-full bg-lime-700 hover:bg-lime-800 text-white"
          >
            {createDeal.isPending ? 'Calculating...' : 'Analyze Deal'}
          </Button>
          {createDeal.isError && (
            <p className="text-red-600 text-sm mt-2">
              {createDeal.error?.message ?? 'Something went wrong. Please try again.'}
            </p>
          )}
        </div>
      </form>
    </motion.div>
  )
}

/** Creative Finance strategy form — dynamic Section B changes based on finance type. */
function CreativeFinanceForm() {
  const createDeal = useCreateDeal()
  const { triggerShake, shakeProps } = useShake()
  const [financeType, setFinanceType] = useState<'subject_to' | 'seller_finance'>('subject_to')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreativeFinanceFormValues>({
    resolver: zodResolver(creativeFinanceSchema),
    defaultValues: {
      finance_type: 'subject_to',
      existing_loan_balance: 0,
      existing_interest_rate: 0,
      monthly_piti: 0,
      monthly_rent_estimate: 0,
      monthly_expenses: 0,
      new_rate: 0,
      new_term_years: 30,
      arv: 0,
    },
  })

  const handleFinanceTypeChange = (type: 'subject_to' | 'seller_finance') => {
    setFinanceType(type)
    setValue('finance_type', type)
  }

  const onSubmit = (values: CreativeFinanceFormValues) => {
    const { address, zip_code } = values
    createDeal.mutate({
      address,
      zip_code,
      property_type: 'single_family',
      strategy: 'creative_finance',
      inputs: {
        existing_loan_balance: Number(values.existing_loan_balance),
        existing_interest_rate: financeType === 'subject_to' ? Number(values.existing_interest_rate) : 0,
        monthly_piti: Number(values.monthly_piti),
        monthly_rent_estimate: Number(values.monthly_rent_estimate),
        monthly_expenses: Number(values.monthly_expenses),
        finance_type: financeType,
        new_rate: financeType === 'seller_finance' ? Number(values.new_rate ?? 0) : 0,
        new_term_years: financeType === 'seller_finance' ? Number(values.new_term_years ?? 0) : 0,
        arv: Number(values.arv),
      },
    })
  }

  return (
    <motion.div {...shakeProps} className="relative rounded-xl border border-gray-200 bg-white shadow-xs p-6">
      {createDeal.isPending && (
        <div className="absolute inset-0 rounded-xl bg-white/80 z-10 flex items-center justify-center">
          <div className="h-full w-full animate-pulse rounded-xl bg-gray-100/50" />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, triggerShake)} className="space-y-6">
        {/* Property Info */}
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cf-address" className="text-gray-600">Property Address</Label>
            <Input
              id="cf-address"
              placeholder="123 Main St, City, State"
              className={`bg-white border-gray-300 text-gray-900 ${errors.address ? 'border-red-500' : ''}`}
              {...register('address')}
            />
            {errors.address && <p className="text-red-600 text-xs">{errors.address.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-zip" className="text-gray-600">Zip Code</Label>
            <Input
              id="cf-zip"
              placeholder="00000"
              maxLength={5}
              className={`tabular-nums bg-white border-gray-300 text-gray-900 w-32 ${errors.zip_code ? 'border-red-500' : ''}`}
              {...register('zip_code')}
            />
            {errors.zip_code && <p className="text-red-600 text-xs">{errors.zip_code.message}</p>}
          </div>
        </div>

        {/* Finance Type Toggle — full width, rendered first */}
        <div className="space-y-1.5">
          <Label className="text-gray-600">
            <ConceptTooltip
              term="Finance Type"
              definition="Subject-To: you take over the seller's existing mortgage. Seller Finance: seller acts as the bank with new negotiated terms."
            >
              Finance Type
            </ConceptTooltip>
          </Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={financeType === 'subject_to' ? 'default' : 'outline'}
              className={`flex-1 tabular-nums ${
                financeType === 'subject_to'
                  ? 'bg-lime-700 hover:bg-lime-800 text-white'
                  : 'border-gray-200 text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => handleFinanceTypeChange('subject_to')}
            >
              Subject-To
            </Button>
            <Button
              type="button"
              variant={financeType === 'seller_finance' ? 'default' : 'outline'}
              className={`flex-1 tabular-nums ${
                financeType === 'seller_finance'
                  ? 'bg-lime-700 hover:bg-lime-800 text-white'
                  : 'border-gray-200 text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => handleFinanceTypeChange('seller_finance')}
            >
              Seller Finance
            </Button>
          </div>
        </div>

        {/* Section A — Always visible (2-column grid) */}
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          {/* Existing Loan Balance */}
          <div className="space-y-1.5">
            <Label htmlFor="existing_loan_balance" className="text-gray-600">
              <ConceptTooltip
                term="Existing Loan Balance"
                definition="Current outstanding mortgage balance the seller owes. This is the amount you're taking over or the basis for seller financing."
              >
                Existing Loan Balance
              </ConceptTooltip>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">$</span>
              <Input
                id="existing_loan_balance"
                type="number"
                step="any"
                min={0}
                placeholder="0"
                className={`tabular-nums bg-white border-gray-300 text-gray-900 pl-7 ${errors.existing_loan_balance ? 'border-red-500' : ''}`}
                {...register('existing_loan_balance', { valueAsNumber: true })}
              />
            </div>
            {errors.existing_loan_balance && (
              <p className="text-red-600 text-xs">{errors.existing_loan_balance.message}</p>
            )}
          </div>

          {/* Monthly Rent Estimate */}
          <div className="space-y-1.5">
            <Label htmlFor="monthly_rent_estimate" className="text-gray-600">
              <ConceptTooltip
                term="Monthly Rent Estimate"
                definition="Expected gross monthly rent at market rate for this property."
              >
                Monthly Rent Estimate
              </ConceptTooltip>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">$</span>
              <Input
                id="monthly_rent_estimate"
                type="number"
                step="any"
                min={0}
                placeholder="0"
                className={`tabular-nums bg-white border-gray-300 text-gray-900 pl-7 ${errors.monthly_rent_estimate ? 'border-red-500' : ''}`}
                {...register('monthly_rent_estimate', { valueAsNumber: true })}
              />
            </div>
            {errors.monthly_rent_estimate && (
              <p className="text-red-600 text-xs">{errors.monthly_rent_estimate.message}</p>
            )}
          </div>

          {/* Additional Monthly Expenses */}
          <div className="space-y-1.5">
            <Label htmlFor="monthly_expenses" className="text-gray-600">
              <ConceptTooltip
                term="Additional Monthly Expenses"
                definition="Maintenance, property management, and other costs BEYOND the mortgage payment."
              >
                Additional Monthly Expenses
              </ConceptTooltip>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">$</span>
              <Input
                id="monthly_expenses"
                type="number"
                step="any"
                min={0}
                placeholder="0"
                className={`tabular-nums bg-white border-gray-300 text-gray-900 pl-7 ${errors.monthly_expenses ? 'border-red-500' : ''}`}
                {...register('monthly_expenses', { valueAsNumber: true })}
              />
            </div>
            {errors.monthly_expenses && (
              <p className="text-red-600 text-xs">{errors.monthly_expenses.message}</p>
            )}
          </div>

          {/* ARV */}
          <div className="space-y-1.5">
            <Label htmlFor="arv" className="text-gray-600">
              <ConceptTooltip
                term="ARV"
                definition="Current or post-repair market value. Used to calculate your equity position from day one."
              >
                ARV (After Repair Value)
              </ConceptTooltip>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">$</span>
              <Input
                id="arv"
                type="number"
                step="any"
                min={0}
                placeholder="0"
                className={`tabular-nums bg-white border-gray-300 text-gray-900 pl-7 ${errors.arv ? 'border-red-500' : ''}`}
                {...register('arv', { valueAsNumber: true })}
              />
            </div>
            {errors.arv && (
              <p className="text-red-600 text-xs">{errors.arv.message}</p>
            )}
          </div>
        </div>

        {/* Section B — Conditional fields based on finance type */}
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          {financeType === 'subject_to' ? (
            <>
              {/* Subject-To: Existing Interest Rate */}
              <div className="space-y-1.5">
                <Label htmlFor="existing_interest_rate" className="text-gray-600">
                  <ConceptTooltip
                    term="Existing Interest Rate"
                    definition="Seller's current mortgage rate you're taking over. This is the key advantage of subject-to — locking in their low rate."
                  >
                    Existing Interest Rate (%)
                  </ConceptTooltip>
                </Label>
                <div className="relative">
                  <Input
                    id="existing_interest_rate"
                    type="number"
                    step="any"
                    min={0}
                    placeholder="0"
                    className={`tabular-nums bg-white border-gray-300 text-gray-900 pr-8 ${errors.existing_interest_rate ? 'border-red-500' : ''}`}
                    {...register('existing_interest_rate', { valueAsNumber: true })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">%</span>
                </div>
                {errors.existing_interest_rate && (
                  <p className="text-red-600 text-xs">{errors.existing_interest_rate.message}</p>
                )}
              </div>

              {/* Subject-To: Existing Monthly PITI */}
              <div className="space-y-1.5">
                <Label htmlFor="monthly_piti" className="text-gray-600">
                  <ConceptTooltip
                    term="Existing Monthly PITI"
                    definition="Seller's current monthly mortgage payment including principal, interest, taxes, and insurance. This becomes YOUR payment."
                  >
                    Existing Monthly PITI
                  </ConceptTooltip>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">$</span>
                  <Input
                    id="monthly_piti"
                    type="number"
                    step="any"
                    min={0}
                    placeholder="0"
                    className={`tabular-nums bg-white border-gray-300 text-gray-900 pl-7 ${errors.monthly_piti ? 'border-red-500' : ''}`}
                    {...register('monthly_piti', { valueAsNumber: true })}
                  />
                </div>
                {errors.monthly_piti && (
                  <p className="text-red-600 text-xs">{errors.monthly_piti.message}</p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Seller Finance: Negotiated Rate */}
              <div className="space-y-1.5">
                <Label htmlFor="new_rate" className="text-gray-600">
                  <ConceptTooltip
                    term="Negotiated Rate"
                    definition="The interest rate you negotiate with the seller. Often below market rate — this is the main benefit of seller financing."
                  >
                    Negotiated Rate (%)
                  </ConceptTooltip>
                </Label>
                <div className="relative">
                  <Input
                    id="new_rate"
                    type="number"
                    step="any"
                    min={0}
                    placeholder="0"
                    className={`tabular-nums bg-white border-gray-300 text-gray-900 pr-8 ${errors.new_rate ? 'border-red-500' : ''}`}
                    {...register('new_rate', { valueAsNumber: true })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">%</span>
                </div>
                {errors.new_rate && (
                  <p className="text-red-600 text-xs">{errors.new_rate.message}</p>
                )}
              </div>

              {/* Seller Finance: Loan Term */}
              <div className="space-y-1.5">
                <Label htmlFor="new_term_years" className="text-gray-600">
                  <ConceptTooltip
                    term="Loan Term (Years)"
                    definition="Length of the seller-financed loan. Balloon payments are common — e.g. 30-year amortization with 5-year balloon."
                  >
                    Loan Term (Years)
                  </ConceptTooltip>
                </Label>
                <div className="relative">
                  <Input
                    id="new_term_years"
                    type="number"
                    step="1"
                    min={0}
                    placeholder="30"
                    className={`tabular-nums bg-white border-gray-300 text-gray-900 ${errors.new_term_years ? 'border-red-500' : ''}`}
                    {...register('new_term_years', { valueAsNumber: true })}
                  />
                </div>
                {errors.new_term_years && (
                  <p className="text-red-600 text-xs">{errors.new_term_years.message}</p>
                )}
              </div>

              {/* Seller Finance: Estimated Monthly PITI */}
              <div className="space-y-1.5">
                <Label htmlFor="monthly_piti" className="text-gray-600">
                  <ConceptTooltip
                    term="Estimated Monthly PITI"
                    definition="Estimated monthly payment including taxes and insurance. Leave at 0 to let the calculator derive from rate and term."
                  >
                    Estimated Monthly PITI
                  </ConceptTooltip>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">$</span>
                  <Input
                    id="monthly_piti"
                    type="number"
                    step="any"
                    min={0}
                    placeholder="0"
                    className={`tabular-nums bg-white border-gray-300 text-gray-900 pl-7 ${errors.monthly_piti ? 'border-red-500' : ''}`}
                    {...register('monthly_piti', { valueAsNumber: true })}
                  />
                </div>
                {errors.monthly_piti && (
                  <p className="text-red-600 text-xs">{errors.monthly_piti.message}</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={createDeal.isPending}
            className="w-full bg-lime-700 hover:bg-lime-800 text-white"
          >
            {createDeal.isPending ? 'Calculating...' : 'Analyze Deal'}
          </Button>
          {createDeal.isError && (
            <p className="text-red-600 text-sm mt-2">
              {createDeal.error?.message ?? 'Something went wrong. Please try again.'}
            </p>
          )}
        </div>
      </form>
    </motion.div>
  )
}

export default function AnalyzerFormPage() {
  const { strategy } = useParams<{ strategy: string }>()

  const isValid = VALID_STRATEGIES.includes(strategy as Strategy)
  const isEnabled = ENABLED_STRATEGIES.includes(strategy as Strategy)

  if (!isValid) {
    return (
      <AppShell title="Analyzer">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <p className="text-gray-400 text-sm">Strategy not found.</p>
            <Link to="/analyze" className="text-lime-700 text-sm hover:underline">
              Back to Analyzer
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!isEnabled) {
    return (
      <AppShell title="Analyzer">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <StrategyBadge strategy={strategy as Strategy} />
            <p className="text-gray-600 text-sm">
              This strategy&apos;s calculator is coming soon.
            </p>
            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 text-lime-700 text-sm hover:underline"
            >
              <ArrowLeft size={14} />
              Back to Analyzer
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Analyzer">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center gap-1.5 text-xs">
            <li>
              <Link to="/dashboard" className="text-gray-400 hover:text-lime-600 transition-colors">
                Dashboard
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} className="text-gray-400" /></li>
            <li>
              <Link to="/analyze" className="text-gray-400 hover:text-lime-600 transition-colors">
                Analyzer
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} className="text-gray-400" /></li>
            <li aria-current="page" className="text-gray-900 font-medium">
              {STRATEGY_DISPLAY_NAMES[strategy as string] ?? 'Unknown'}
            </li>
          </ol>
        </nav>

        <div className="mb-6 flex items-center gap-3">
          <StrategyBadge strategy={strategy as Strategy} />
          <h2 className="text-lg font-semibold text-gray-900">
            {STRATEGY_LABELS[strategy as string] ?? 'Analyzer'}
          </h2>
        </div>

        {strategy === 'wholesale' && <WholesaleForm />}
        {strategy === 'buy_and_hold' && <BuyAndHoldForm />}
        {strategy === 'flip' && <FlipForm />}
        {strategy === 'brrrr' && <BRRRRForm />}
        {strategy === 'creative_finance' && <CreativeFinanceForm />}
      </div>
    </AppShell>
  )
}
