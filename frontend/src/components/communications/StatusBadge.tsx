/** StatusBadge — inline delivery status indicator with icon + label. */

import { Edit3, Clock, Check, CheckCheck, Eye, ExternalLink, AlertCircle, XCircle } from 'lucide-react'
import type { DeliveryStatus } from '@/types'
import { cn } from '@/lib/utils'

interface StatusConfig {
  icon: React.ComponentType<{ size?: number; color?: string }>
  color: string
  label: string
}

const STATUS_MAP: Record<DeliveryStatus, StatusConfig> = {
  logged:    { icon: Edit3,         color: '#8A8580', label: 'Logged' },
  queued:    { icon: Clock,         color: '#8A8580', label: 'Queued' },
  sent:      { icon: Check,         color: '#60A5FA', label: 'Sent' },
  delivered: { icon: CheckCheck,    color: '#4ADE80', label: 'Delivered' },
  opened:    { icon: Eye,           color: '#60A5FA', label: 'Opened' },
  clicked:   { icon: ExternalLink,  color: '#8B7AFF', label: 'Clicked' },
  failed:    { icon: AlertCircle,   color: '#EF4444', label: 'Failed' },
  bounced:   { icon: XCircle,       color: '#EF4444', label: 'Bounced' },
}

interface Props {
  status: DeliveryStatus
  errorMessage?: string | null
  className?: string
}

export function StatusBadge({ status, errorMessage, className }: Props) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.logged
  const Icon = cfg.icon
  const tooltip = errorMessage ?? cfg.label

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      title={tooltip}
    >
      <Icon size={10} color={cfg.color} />
      <span className="text-[10px]" style={{ color: cfg.color }}>
        {cfg.label}
      </span>
    </span>
  )
}
