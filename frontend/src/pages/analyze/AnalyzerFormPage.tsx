/** Deal analyzer form page — wholesale form with validation, coming soon state for other strategies. */

import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { ConceptTooltip } from '@/components/ui/ConceptTooltip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { wholesaleSchema, type WholesaleFormValues } from '@/lib/schemas'
import { useCreateDeal } from '@/hooks/useDeals'
import type { Strategy } from '@/types'

const VALID_STRATEGIES: Strategy[] = ['wholesale', 'creative_finance', 'brrrr', 'buy_and_hold', 'flip']

interface FieldConfig {
  name: keyof WholesaleFormValues
  label: string
  adornment: 'dollar' | 'percent'
  tooltip: string
}

const WHOLESALE_FIELDS: FieldConfig[] = [
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
    tooltip: 'Estimated closing costs as a percentage of ARV. Typically 2\u20134%.',
  },
  {
    name: 'asking_price',
    label: "Seller's Asking Price",
    adornment: 'dollar',
    tooltip: 'The price the seller is currently asking for the property.',
  },
]

export default function AnalyzerFormPage() {
  const { strategy } = useParams<{ strategy: string }>()
  const createDeal = useCreateDeal()

  const isValid = VALID_STRATEGIES.includes(strategy as Strategy)
  const isWholesale = strategy === 'wholesale'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WholesaleFormValues>({
    resolver: zodResolver(wholesaleSchema),
  })

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

  if (!isWholesale) {
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

  const onSubmit = (values: WholesaleFormValues) => {
    createDeal.mutate({
      address: `Analysis \u2014 ${new Date().toLocaleDateString()}`,
      zip_code: '00000',
      property_type: 'single_family',
      strategy: 'wholesale',
      inputs: { ...values },
    })
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
          <StrategyBadge strategy="wholesale" />
          <h2 className="text-lg font-semibold text-text-primary">Wholesale Analyzer</h2>
        </div>

        <div className="relative rounded-xl border border-border-default bg-app-surface p-6">
          {/* Skeleton shimmer overlay while submitting */}
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
      </div>
    </AppShell>
  )
}
