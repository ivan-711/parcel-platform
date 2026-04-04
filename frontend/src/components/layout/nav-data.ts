import {
  Calendar,
  LayoutGrid,
  Search,
  KanbanSquare,
  Building,
  Users,
  Tag,
  BarChart3,
  AlertTriangle,
  Hammer,
  DollarSign,
  FileText,
  Folder,
  Repeat,
  Mail,
  MapPin,
  Settings,
  Shield,
  MessageSquare,
  MoreHorizontal,
  Landmark,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* ─── Types ─── */

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  locked?: boolean
  matchExact?: boolean
}

export interface NavSection {
  label: string
  items: NavItem[]
}

/* ─── Sidebar Sections ─── */

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'HOME',
    items: [
      { label: 'Today', path: '/today', icon: Calendar, matchExact: true },
      { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid, matchExact: true },
    ],
  },
  {
    label: 'DEALS',
    items: [
      { label: 'Analyze', path: '/analyze', icon: Search },
      { label: 'Pipeline', path: '/pipeline', icon: KanbanSquare },
      { label: 'Properties', path: '/properties', icon: Building },
    ],
  },
  {
    label: 'PEOPLE',
    items: [
      { label: 'Contacts', path: '/contacts', icon: Users },
      { label: 'Buyers', path: '/buyers', icon: Tag, locked: true },
    ],
  },
  {
    label: 'ASSETS',
    items: [
      { label: 'Portfolio', path: '/portfolio', icon: BarChart3 },
      { label: 'Financing', path: '/financing', icon: Landmark },
      { label: 'Obligations', path: '/obligations', icon: AlertTriangle },
      { label: 'Rehabs', path: '/rehabs', icon: Hammer, locked: true },
      { label: 'Transactions', path: '/transactions', icon: DollarSign },
    ],
  },
  {
    label: 'OUTPUTS',
    items: [
      { label: 'Reports', path: '/reports', icon: FileText },
      { label: 'Documents', path: '/documents', icon: Folder },
    ],
  },
  {
    label: 'OUTREACH',
    items: [
      { label: 'Sequences', path: '/sequences', icon: Repeat, locked: true },
      { label: 'Skip Tracing', path: '/skip-tracing', icon: Search, locked: true },
      { label: 'Mail Campaigns', path: '/mail-campaigns', icon: Mail, locked: true },
      { label: 'D4D', path: '/d4d', icon: MapPin, locked: true },
    ],
  },
]

/* ─── Bottom Nav (below scrollable sections) ─── */

export const BOTTOM_NAV: NavItem[] = [
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'Compliance', path: '/compliance', icon: Shield, locked: true },
]

/* ─── Mobile Primary Tabs ─── */

export const MOBILE_PRIMARY_TABS: { label: string; path: string; icon: LucideIcon }[] = [
  { label: 'Today', path: '/today', icon: Calendar },
  { label: 'Analyze', path: '/analyze', icon: Search },
  { label: 'Pipeline', path: '/pipeline', icon: KanbanSquare },
  { label: 'Chat', path: '/chat', icon: MessageSquare },
]

export const MORE_ICON = MoreHorizontal
