/** InteractiveDealCalc — visitor-facing simplified deal calculator on the landing page.
 *  Lets prospects play with purchase price, down payment, rent, and strategy
 *  to see approximate KPIs and a 12-month cash flow projection chart.
 *  All math is front-end only — simplified approximations, not the real analysis engine. */

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

/* ── Zod schema ── */
const calcSchema = z.object({
  purchasePrice: z
    .number({ error: 'Enter a valid number' })
    .min(10_000, 'Min $10,000')
    .max(10_000_000, 'Max $10,000,000'),
  downPayment: z
    .number({ error: 'Enter a valid number' })
    .min(0, 'Min 0%')
    .max(100, 'Max 100%'),
  monthlyRent: z
    .number({ error: 'Enter a valid number' })
    .min(0, 'Min $0')
    .max(50_000, 'Max $50,000'),
  strategy: z.enum([
    'buy_and_hold',
    'brrrr',
    'wholesale',
    'creative_finance',
    'flip',
  ]),
})

type CalcFormValues = z.infer<typeof calcSchema>

/* ── Strategy display labels ── */
const STRATEGY_OPTIONS: { value: CalcFormValues['strategy']; label: string }[] = [
  { value: 'buy_and_hold', label: 'Buy & Hold' },
  { value: 'brrrr', label: 'BRRRR' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'creative_finance', label: 'Creative Finance' },
  { value: 'flip', label: 'Flip' },
]

/* ── Helpers ── */

/** Format a number as compact currency ($1,234) */
function fmtCurrency(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

/** Format a number as a percentage with one decimal */
function fmtPercent(n: number): string {
  return `${n.toFixed(1)}%`
}

/* ── Chart gradient id ── */
const GRADIENT_ID = 'calcCashFlowGrad'

/* ── Component ── */

export function InteractiveDealCalc() {
  const {
    register,
    watch,
    formState: { errors },
  } = useForm<CalcFormValues>({
    resolver: zodResolver(calcSchema),
    defaultValues: {
      purchasePrice: 150_000,
      downPayment: 20,
      monthlyRent: 1_400,
      strategy: 'buy_and_hold',
    },
    mode: 'onChange',
  })

  const purchasePrice = watch('purchasePrice')
  const downPayment = watch('downPayment')
  const monthlyRent = watch('monthlyRent')

  /* ── Derived KPIs ── */
  const metrics = useMemo(() => {
    const pp = Number(purchasePrice) || 0
    const dp = Number(downPayment) || 0
    const rent = Number(monthlyRent) || 0

    const downPaymentAmount = pp * (dp / 100)
    const loanAmount = pp - downPaymentAmount

    // Monthly mortgage (6.5%, 30 yr fixed) — standard amortization formula
    const monthlyRate = 0.065 / 12
    let monthlyMortgage = 0
    if (loanAmount > 0) {
      monthlyMortgage =
        (loanAmount * monthlyRate) /
        (1 - Math.pow(1 + monthlyRate, -360))
    }

    // Monthly expenses: mortgage + property tax + vacancy + maintenance
    const propertyTaxMonthly = (pp * 0.012) / 12
    const vacancyReserve = rent * 0.08
    const maintenanceReserve = 100
    const monthlyExpenses =
      monthlyMortgage + propertyTaxMonthly + vacancyReserve + maintenanceReserve

    const monthlyCashFlow = rent - monthlyExpenses
    const annualCashFlow = monthlyCashFlow * 12

    // Cash-on-Cash: annual cash flow / total cash invested
    let cashOnCash = 0
    if (downPaymentAmount > 0) {
      cashOnCash = (annualCashFlow / downPaymentAmount) * 100
    }

    // Cap Rate: NOI / purchase price
    const annualExpensesExMortgage =
      pp * 0.012 + rent * 12 * 0.08 + 1200
    const noi = rent * 12 - annualExpensesExMortgage
    let capRate = 0
    if (pp > 0) {
      capRate = (noi / pp) * 100
    }

    // 12-month cumulative projection
    const projection = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      cashFlow: Math.round(monthlyCashFlow * (i + 1)),
    }))

    return {
      monthlyCashFlow,
      annualCashFlow,
      cashOnCash,
      capRate,
      projection,
    }
  }, [purchasePrice, downPayment, monthlyRent])

  /* ── KPI card data ── */
  const kpis: {
    label: string
    value: string
    raw: number
    format: 'currency' | 'percent'
  }[] = [
    {
      label: 'Monthly Cash Flow',
      value: fmtCurrency(metrics.monthlyCashFlow),
      raw: metrics.monthlyCashFlow,
      format: 'currency',
    },
    {
      label: 'Cash-on-Cash Return',
      value: fmtPercent(metrics.cashOnCash),
      raw: metrics.cashOnCash,
      format: 'percent',
    },
    {
      label: 'Cap Rate',
      value: fmtPercent(metrics.capRate),
      raw: metrics.capRate,
      format: 'percent',
    },
    {
      label: 'Annual Cash Flow',
      value: fmtCurrency(metrics.annualCashFlow),
      raw: metrics.annualCashFlow,
      format: 'currency',
    },
  ]

  return (
    <section
      id="deal-calculator"
      className="py-24 px-6 border-t border-gray-200 bg-gray-50"
    >
      <div className="max-w-5xl mx-auto space-y-14">
        {/* ── Section header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="space-y-3"
        >
          <p className="text-[10px] uppercase tracking-[0.08em] text-lime-700 font-semibold">
            Try It Now
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-gray-900">
            Run the numbers before you sign up
          </h2>
          <p className="text-sm text-gray-500 max-w-lg">
            Plug in a deal and see estimated returns instantly. This is a
            simplified preview — the full analyzer covers five strategies with
            deeper metrics.
          </p>
        </motion.div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Left: Inputs ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5 shadow-xs"
          >
            <h3 className="text-sm font-medium text-gray-900">
              Deal Inputs
            </h3>

            {/* Purchase Price */}
            <div>
              <label
                htmlFor="calc-purchase-price"
                className="block text-xs font-medium text-gray-500 uppercase tracking-[0.08em] mb-1.5"
              >
                Purchase Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">
                  $
                </span>
                <input
                  id="calc-purchase-price"
                  type="number"
                  inputMode="numeric"
                  {...register('purchasePrice', { valueAsNumber: true })}
                  className="bg-white border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm text-gray-900 tabular-nums focus:border-lime-500 focus:ring-1 focus:ring-lime-500/20 outline-none w-full transition-colors duration-150"
                />
              </div>
              {errors.purchasePrice && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.purchasePrice.message}
                </p>
              )}
            </div>

            {/* Down Payment */}
            <div>
              <label
                htmlFor="calc-down-payment"
                className="block text-xs font-medium text-gray-500 uppercase tracking-[0.08em] mb-1.5"
              >
                Down Payment
              </label>
              <div className="relative">
                <input
                  id="calc-down-payment"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  {...register('downPayment', { valueAsNumber: true })}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 tabular-nums focus:border-lime-500 focus:ring-1 focus:ring-lime-500/20 outline-none w-full pr-8 transition-colors duration-150"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">
                  %
                </span>
              </div>
              {errors.downPayment && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.downPayment.message}
                </p>
              )}
            </div>

            {/* Monthly Rent */}
            <div>
              <label
                htmlFor="calc-monthly-rent"
                className="block text-xs font-medium text-gray-500 uppercase tracking-[0.08em] mb-1.5"
              >
                Monthly Rent
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm tabular-nums">
                  $
                </span>
                <input
                  id="calc-monthly-rent"
                  type="number"
                  inputMode="numeric"
                  {...register('monthlyRent', { valueAsNumber: true })}
                  className="bg-white border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm text-gray-900 tabular-nums focus:border-lime-500 focus:ring-1 focus:ring-lime-500/20 outline-none w-full transition-colors duration-150"
                />
              </div>
              {errors.monthlyRent && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.monthlyRent.message}
                </p>
              )}
            </div>

            {/* Strategy */}
            <div>
              <label
                htmlFor="calc-strategy"
                className="block text-xs font-medium text-gray-500 uppercase tracking-[0.08em] mb-1.5"
              >
                Strategy
              </label>
              <select
                id="calc-strategy"
                {...register('strategy')}
                className="bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:border-lime-500 focus:ring-1 focus:ring-lime-500/20 outline-none w-full cursor-pointer transition-colors duration-150 appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
              >
                {STRATEGY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[10px] text-gray-400 leading-relaxed pt-1">
              Estimates assume 6.5% interest, 30-year fixed, 1.2% property tax,
              8% vacancy, and $100/mo maintenance. Actual results will vary.
            </p>
          </motion.div>

          {/* ── Right: Outputs ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="space-y-3"
          >
            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3">
              {kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs"
                >
                  <p className="text-[9px] uppercase tracking-[0.08em] text-gray-400 mb-1">
                    {kpi.label}
                  </p>
                  <p
                    className={`text-xl font-semibold tabular-nums ${
                      kpi.raw >= 0
                        ? 'text-sky-600'
                        : 'text-red-500'
                    }`}
                  >
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            {/* 12-month projection chart */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 mt-3 shadow-xs">
              <p className="text-xs text-gray-500 mb-3">
                12-Month Cash Flow Projection
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart
                  data={metrics.projection}
                  margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                >
                  <defs>
                    <linearGradient
                      id={GRADIENT_ID}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#84CC16"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="100%"
                        stopColor="#84CC16"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#667085', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#667085', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      `$${(v / 1000).toFixed(v === 0 ? 0 : 1)}k`
                    }
                    width={44}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #EAECF0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: "'Inter', sans-serif",
                      boxShadow: '0 4px 8px -2px rgba(16,24,40,0.10)',
                    }}
                    labelStyle={{ color: '#667085', fontSize: '10px' }}
                    itemStyle={{ color: '#1D2939' }}
                    formatter={(value: number) => [fmtCurrency(value), 'Cumulative']}
                    labelFormatter={(label: number) => `Month ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="cashFlow"
                    stroke="#4D7C0F"
                    strokeWidth={2}
                    fill={`url(#${GRADIENT_ID})`}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
