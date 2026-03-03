/** AvatarStack — overlapping avatar initials with count badge for social proof. */

const AVATARS = [
  { initials: 'JK', bg: '#6366F1' },
  { initials: 'MR', bg: '#8B5CF6' },
  { initials: 'DL', bg: '#10B981' },
  { initials: 'AS', bg: '#F59E0B' },
  { initials: 'TC', bg: '#3B82F6' },
]

export function AvatarStack({ count = 2400 }: { count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {AVATARS.map(({ initials, bg }) => (
          <div
            key={initials}
            className="w-7 h-7 rounded-full border-2 border-app-bg flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: bg }}
          >
            {initials}
          </div>
        ))}
      </div>
      <span className="text-xs text-text-muted">
        Join <span className="text-text-secondary font-medium font-mono">{count.toLocaleString()}+</span> investors
      </span>
    </div>
  )
}
