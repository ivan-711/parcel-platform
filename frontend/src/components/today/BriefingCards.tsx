import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, AlertCircle, Info, CheckCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TodayBriefingItem } from '@/types'

const SEVERITY_CONFIG = {
  urgent: {
    icon: AlertTriangle,
    border: 'border-l-[#F87171]',
    iconColor: 'text-[#F87171]',
    bg: 'bg-[#F87171]/5',
  },
  warning: {
    icon: AlertCircle,
    border: 'border-l-[#FBBF24]',
    iconColor: 'text-[#FBBF24]',
    bg: 'bg-[#FBBF24]/5',
  },
  info: {
    icon: Info,
    border: 'border-l-[#60A5FA]',
    iconColor: 'text-[#60A5FA]',
    bg: 'bg-[#60A5FA]/5',
  },
} as const

interface Props {
  items: TodayBriefingItem[]
}

export function BriefingCards({ items }: Props) {
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="bg-[#141311] border border-[#1E1D1B] border-l-[3px] border-l-[#4ADE80] rounded-xl p-4 flex items-center gap-3">
        <CheckCircle size={18} className="text-[#4ADE80] shrink-0" />
        <div>
          <p className="text-sm text-[#F0EDE8] font-medium">All clear</p>
          <p className="text-xs text-[#8A8580]">Your portfolio is healthy — no action needed right now.</p>
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
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
            className={cn(
              'flex-shrink-0 w-[280px] text-left bg-[#141311] border border-[#1E1D1B] border-l-[3px] rounded-xl p-4 hover:bg-[#1A1918] transition-colors cursor-pointer group',
              config.border,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 min-w-0">
                <Icon size={16} className={cn('shrink-0 mt-0.5', config.iconColor)} />
                <div className="min-w-0">
                  <p className="text-sm text-[#F0EDE8] font-medium line-clamp-2">{item.title}</p>
                  <p className="text-xs text-[#8A8580] mt-1 line-clamp-2">{item.description}</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-[#8A8580] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
