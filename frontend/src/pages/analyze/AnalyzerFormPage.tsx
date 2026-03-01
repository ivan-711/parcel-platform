/** Deal analyzer form page — strategy-aware form for wholesale and buy & hold, coming soon for others. */

import { useParams, Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { ConceptTooltip } from '@/components/ui/ConceptTooltip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  wholesaleSchema,
  buyAndHoldSchema,
  type WholesaleFormValues,
  type BuyAndHoldFormValues,
} from '@/lib/schemas'
import { useCreateDeal } from '@/hooks/useDeals'
import type { Strategy } from '@/types'

const VALID_STRATEGIES: Strategy[] = ['wholesale', 'creative_finance', 'brrrr', 'buy_and_hold', 'flip']
const ENABLED_STRATEGIES: Strategy[] = ['wholesale', 'buy_and_hold']

interface FieldConfig<T extends string> {
  name: T
  label: string
  adornment: 'dollar' | 'percent'
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
}

/** Wholesale strategy form. */
function WholesaleForm() {
  const createDeal = useCreateDeal()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WholesaleFormValues>({
    resolver: zodResolver(wholesaleSchema),
  })

  const onSubmit = (values: WholesaleFormValues) => {
    createDeal.mutate({
      address: `Analysis — ${new Date().toLocaleDateString()}`,
      zip_code: '00000',
      property_type: 'single_family',
      strategy: 'wholesale',
      inputs: { ...values },
    })
  }

  return (
    <div className="relative rounded-xl border border-border-default bg-app-surface p-6">
      {createDeal.isPending && (
        <div className="absolute inset-0 rounded-xl bg-app-surface/80 z-10 flex items-center justify-center">
          <div className="h-full w-full animate-pulse rounded-xl bg-app-elevated/30" />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          {WHOLESALE_FIELDS.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={field.name} className="text-text-secondary">
                <ConceptTooltip term={field.label} definition={field.tooltip}>
                  {field.label}
                </ConceptTooltip>
              </Label>
              <div className="relative">
                {field.adornment === 'dollar' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-mono">
                    $
                  </span>
                )}
                <Input
                  id={field.name}
                  type="number"
                  step="any"
                  placeholder="0"
                  className={`font-mono bg-app-bg border-border-default text-text-primary ${
                    field.adornment === 'dollar' ? 'pl-7' : 'pr-8'
                  } ${errors[field.name] ? 'border-accent-danger' : ''}`}
                  {...register(field.name, { valueAsNumber: true })}
                />
                {field.adornment === 'percent' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-mono">
                    %
                  </span>
                )}
              </div>
              {errors[field.name] && (
                <p className="text-accent-danger text-xs">{errors[field.name]?.message}</p>
              )}
            </div>
          ))}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={createDeal.isPending}
            className="w-full bg-accent-primary hover:bg-accent-primary/90 text-white"
          >
            {createDeal.isPending ? 'Calculating...' : 'Analyze Deal'}
          </Button>
          {createDeal.isError && (
            <p className="text-accent-danger text-sm mt-2">
              {createDeal.error?.message ?? 'Something went wrong. Please try again.'}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}

/** Buy & Hold strategy form. */
function BuyAndHoldForm() {
  const createDeal = useCreateDeal()
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
    createDeal.mutate({
      address: `Buy & Hold Analysis — ${new Date().toLocaleDateString()}`,
      zip_code: '00000',
      property_type: 'single_family',
      strategy: 'buy_and_hold',
      inputs: { ...values },
    })
  }

  return (
    <div className="relative rounded-xl border border-border-default bg-app-surface p-6">
      {createDeal.isPending && (
        <div className="absolute inset-0 rounded-xl bg-app-surface/80 z-10 flex items-center justify-center">
          <div className="h-full w-full animate-pulse rounded-xl bg-app-elevated/30" />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          {BUY_AND_HOLD_FIELDS.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={field.name} className="text-text-secondary">
                <ConceptTooltip term={field.label} definition={field.tooltip}>
                  {field.label}
                </ConceptTooltip>
              </Label>
              <div className="relative">
                {field.adornment === 'dollar' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-mono">
                    $
                  </span>
                )}
                <Input
                  id={field.name}
                  type="number"
                  step="any"
                  placeholder="0"
                  className={`font-mono bg-app-bg border-border-default text-text-primary ${
                    field.adornment === 'dollar' ? 'pl-7' : 'pr-8'
                  } ${errors[field.name] ? 'border-accent-danger' : ''}`}
                  {...register(field.name, { valueAsNumber: true })}
                />
                {field.adornment === 'percent' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-mono">
                    %
                  </span>
                )}
              </div>
              {errors[field.name] && (
                <p className="text-accent-danger text-xs">{errors[field.name]?.message}</p>
              )}
            </div>
          ))}
        </div>

        {/* Loan Term Toggle — full width */}
        <div className="space-y-1.5">
          <Label className="text-text-secondary">
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
                  className={`flex-1 font-mono ${
                    field.value === 15
                      ? 'bg-accent-primary hover:bg-accent-primary/90 text-white'
                      : 'border-border-default text-text-secondary hover:text-text-primary'
                  }`}
                  onClick={() => field.onChange(15)}
                >
                  15 Years
                </Button>
                <Button
                  type="button"
                  variant={field.value === 30 ? 'default' : 'outline'}
                  className={`flex-1 font-mono ${
                    field.value === 30
                      ? 'bg-accent-primary hover:bg-accent-primary/90 text-white'
                      : 'border-border-default text-text-secondary hover:text-text-primary'
                  }`}
                  onClick={() => field.onChange(30)}
                >
                  30 Years
                </Button>
              </div>
            )}
          />
          {errors.loan_term_years && (
            <p className="text-accent-danger text-xs">{errors.loan_term_years.message}</p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={createDeal.isPending}
            className="w-full bg-accent-primary hover:bg-accent-primary/90 text-white"
          >
            {createDeal.isPending ? 'Calculating...' : 'Analyze Deal'}
          </Button>
          {createDeal.isError && (
            <p className="text-accent-danger text-sm mt-2">
              {createDeal.error?.message ?? 'Something went wrong. Please try again.'}
            </p>
          )}
        </div>
      </form>
    </div>
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
            <p className="text-text-muted text-sm">Strategy not found.</p>
            <Link to="/analyze" className="text-accent-primary text-sm hover:underline">
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
            <p className="text-text-secondary text-sm">
              This strategy&apos;s calculator is coming soon.
            </p>
            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 text-accent-primary text-sm hover:underline"
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
        <div className="mb-6 flex items-center gap-3">
          <Link
            to="/analyze"
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <StrategyBadge strategy={strategy as Strategy} />
          <h2 className="text-lg font-semibold text-text-primary">
            {STRATEGY_LABELS[strategy as string] ?? 'Analyzer'}
          </h2>
        </div>

        {strategy === 'wholesale' && <WholesaleForm />}
        {strategy === 'buy_and_hold' && <BuyAndHoldForm />}
      </div>
    </AppShell>
  )
}
