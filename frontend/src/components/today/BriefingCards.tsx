import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/motion'
import { AlertTriangle, AlertCircle, Info, CheckCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TodayBriefingItem } from '@/types'

const SEVERITY_CONFIG = {
  urgent: {
    icon: AlertTriangle,
    iconColor: 'text-loss',
    bg: 'bg-loss/5',
  },
  warning: {
    icon: AlertCircle,
    iconColor: 'text-warning',
    bg: 'bg-warning/5',
  },
  info: {
    icon: Info,
    iconColor: 'text-info',
    bg: 'bg-info/5',
  },
} as const

interface Props {
  items: TodayBriefingItem[]
}

export function BriefingCards({ items }: Props) {
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="bg-profit/5 border border-border-default rounded-xl p-4 flex items-center gap-3">
        <CheckCircle size={18} className="text-profit shrink-0" />
        <div>
          <p className="text-sm text-text-primary font-medium">All clear</p>
          <p className="text-xs text-text-muted">Your portfolio is healthy — no action needed right now.</p>
        </div>
      </div>
    )
  }

  // Sort: urgent first, then warning, then info
  const sorted = [...items].sort((a, b) => {
    const order = { urgent: 0, warning: 1, info: 2 }
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
  })

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-luxury pb-1">
      {sorted.map((item, i) => {
        const config = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.info
        const Icon = config.icon

        return (
          <motion.button
            key={item.id}
            aria-label={`${item.severity} briefing: ${item.title}`}
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: i * 0.05, duration: 0.2 }}
            onClick={() => {
              if (item.action_url) navigate(item.action_url)
              try {
                (window as any).posthog?.capture?.('briefing_item_clicked', {
                  severity: item.severity,
                  entity_type: item.entity_type,
                  title: item.title,
                })
              } catch { /* ignore */ }
            }}
            whileHover={prefersReducedMotion ? undefined : { y: -2 }}
            className={cn(
              'flex-shrink-0 w-[280px] text-left border border-border-default rounded-xl p-4 hover:bg-app-surface transition-shadow duration-200 hover:shadow-lg cursor-pointer group',
              config.bg,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 min-w-0">
                <Icon size={16} className={cn('shrink-0 mt-0.5', config.iconColor)} />
                <div className="min-w-0">
                  <p className="text-sm text-text-primary font-medium line-clamp-2">{item.title}</p>
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">{item.description}</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
