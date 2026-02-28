import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, GitBranch, FileText, MessageSquare } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

interface HintCard {
  icon: React.ElementType
  title: string
  description: string
}

const HINT_CARDS: HintCard[] = [
  {
    icon: GitBranch,
    title: 'Pipeline',
    description: 'Track deals from lead to close',
  },
  {
    icon: FileText,
    title: 'Documents',
    description: 'Upload contracts and leases',
  },
  {
    icon: MessageSquare,
    title: 'AI Chat',
    description: 'Ask anything about a deal',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
}

/** Dashboard empty state — shown to new users before their first deal. */
export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <AppShell title="Dashboard">
      <motion.div
        className="max-w-2xl space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Heading */}
        <motion.h1
          variants={itemVariants}
          className="text-3xl font-semibold text-text-primary"
        >
          Let&apos;s analyze your first deal.
        </motion.h1>

        {/* Primary CTA card */}
        <motion.div variants={itemVariants}>
          <motion.button
            onClick={() => navigate('/analyze')}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="w-full text-left p-6 rounded-xl border border-accent-primary/30 bg-accent-primary/10 hover:border-accent-primary/60 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-base font-semibold text-text-primary">
                  Analyze Your First Deal
                </p>
                <p className="text-sm text-text-secondary">
                  Run numbers on any strategy — wholesale, BRRRR, flip, or buy &amp; hold.
                </p>
              </div>
              <ArrowRight
                size={20}
                className="text-accent-primary shrink-0 ml-4 group-hover:translate-x-0.5 transition-transform"
              />
            </div>
          </motion.button>
        </motion.div>

        {/* Hint cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
          {HINT_CARDS.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="p-4 rounded-xl border border-border-subtle bg-app-surface space-y-2 cursor-default"
            >
              <div className="w-8 h-8 rounded-lg bg-app-elevated flex items-center justify-center">
                <Icon size={16} className="text-text-secondary" />
              </div>
              <p className="text-sm font-medium text-text-primary">{title}</p>
              <p className="text-xs text-text-muted leading-relaxed">{description}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </AppShell>
  )
}
