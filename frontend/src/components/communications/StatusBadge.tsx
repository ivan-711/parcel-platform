/** StatusBadge — inline delivery status indicator with icon + label. */

import { Edit3, Clock, Check, CheckCheck, Eye, ExternalLink, AlertCircle, XCircle, type LucideIcon } from 'lucide-react'
import type { DeliveryStatus } from '@/types'
import { cn } from '@/lib/utils'

interface StatusConfig {
  icon: LucideIcon
  color: string
  label: string
}

const STATUS_MAP: Record<DeliveryStatus, StatusConfig> = {
  logged:    { icon: Edit3,         color: 'var(--text-muted)', label: 'Logged' },
  queued:    { icon: Clock,         color: 'var(--text-muted)', label: 'Queued' },
  sent:      { icon: Check,         color: 'var(--accent-info)', label: 'Sent' },
  delivered: { icon: CheckCheck,    color: 'var(--color-profit)', label: 'Delivered' },
  opened:    { icon: Eye,           color: 'var(--accent-info)', label: 'Opened' },
  clicked:   { icon: ExternalLink,  color: 'var(--accent-primary)', label: 'Clicked' },
  failed:    { icon: AlertCircle,   color: 'var(--color-loss)', label: 'Failed' },
  bounced:   { icon: XCircle,       color: 'var(--color-loss)', label: 'Bounced' },
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
