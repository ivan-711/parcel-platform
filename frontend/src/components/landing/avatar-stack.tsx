/** AvatarStack — overlapping avatar initials with count badge for social proof. */

const AVATARS = [
  { initials: 'JK', bg: '#4D7C0F' },
  { initials: 'MR', bg: '#0284C7' },
  { initials: 'DL', bg: '#4F46E5' },
  { initials: 'AS', bg: '#D97706' },
  { initials: 'TC', bg: '#0369A1' },
]

export function AvatarStack({ count = 2400 }: { count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {AVATARS.map(({ initials, bg }) => (
          <div
            key={initials}
            className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: bg }}
          >
            {initials}
          </div>
        ))}
      </div>
      <span className="text-xs text-gray-400">
        Join <span className="text-gray-600 font-medium tabular-nums">{count.toLocaleString()}+</span> investors
      </span>
    </div>
  )
}
