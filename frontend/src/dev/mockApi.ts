/**
 * Mock API interceptor for DEV_PREVIEW mode.
 * Replaces all api.* methods with mock data returns.
 * Activated by calling installMockApi() before the app renders.
 */

import { api } from '@/lib/api'
import {
  MOCK_USER,
  MOCK_PROPERTIES,
  MOCK_CONTACTS,
  MOCK_PIPELINE,
  MOCK_INSTRUMENTS,
  MOCK_OBLIGATIONS,
  MOCK_TASKS,
  MOCK_REHAB_PROJECTS,
  MOCK_REHAB_ITEMS,
  MOCK_TRANSACTIONS,
  MOCK_TODAY,
  MOCK_DASHBOARD_STATS,
  MOCK_PORTFOLIO_OVERVIEW,
  MOCK_SEQUENCES,
  MOCK_SKIP_TRACES,
  MOCK_MAIL_CAMPAIGNS,
  MOCK_REPORTS,
  MOCK_DOCUMENTS,
  MOCK_BUYERS,
} from './mockData'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate network delay */
const delay = (ms?: number) =>
  new Promise<void>((r) => setTimeout(r, ms ?? 200 + Math.random() * 300))

/** Wrap a value in a delayed promise */
async function mock<T>(data: T, ms?: number): Promise<T> {
  await delay(ms)
  return structuredClone(data) as T
}

/** Return a 404 error after delay */
async function notFound(msg = 'Not found'): Promise<never> {
  await delay(100)
  throw new Error(msg)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyApi = Record<string, any>

// ---------------------------------------------------------------------------
// Install mock overrides
// ---------------------------------------------------------------------------

export function installMockApi() {
  const a = api as AnyApi

  // ── Auth ──
  a.auth = {
    login: () => mock({ user: MOCK_USER }),
    register: () => mock({ user: MOCK_USER }),
    logout: () => mock({ message: 'ok' }),
    refresh: () => mock({ user: MOCK_USER }),
    forgotPassword: () => mock({ message: 'ok' }),
    resetPassword: () => mock({ message: 'ok' }),
    me: () => mock(MOCK_USER),
    updateMe: () => mock({ user: MOCK_USER }),
  }

  // ── Health ──
  a.health = { check: () => mock({ status: 'ok' }) }

  // ── Dashboard ──
  a.dashboard = { stats: () => mock(MOCK_DASHBOARD_STATS) }

  // ── Activity ──
  a.activity = {
    list: () => mock({ items: MOCK_TODAY.recent_activity, total: MOCK_TODAY.recent_activity.length }),
  }

  // ── Today ──
  a.today = { get: () => mock(MOCK_TODAY) }

  // ── Deals ──
  a.deals = {
    list: () => mock(MOCK_PROPERTIES.slice(0, 3).map((p) => ({
      id: p.id, address: p.address, city: p.city, state: p.state, zip_code: p.zip_code,
      strategy: p.strategy, status: p.status, purchase_price: p.purchase_price,
      estimated_value: p.estimated_value, monthly_rent: p.monthly_rent,
      created_at: p.created_at, updated_at: p.updated_at,
    }))),
    get: (id: string) => {
      const p = MOCK_PROPERTIES.find((x) => x.id === id)
      return p ? mock(p) : notFound('Deal not found')
    },
    create: (data: AnyApi) => mock({ id: crypto.randomUUID(), ...data, created_at: new Date().toISOString() }),
    update: (_id: string, data: AnyApi) => mock(data),
    delete: () => mock({ message: 'ok' }),
    getShared: () => notFound('No shared deal'),
    share: () => mock({ share_url: '/share/demo' }),
  }

  // ── Pipeline ──
  a.pipeline = {
    list: () => mock({ data: MOCK_PIPELINE }),
    add: (data: AnyApi) => mock({ id: crypto.randomUUID(), ...data }),
    updateStage: (_id: string, body: AnyApi) => mock({ id: _id, ...body }),
    remove: () => mock({ message: 'ok' }),
    stats: () => mock({
      total: 3, by_stage: { lead: 1, contacted: 1, negotiating: 0, under_contract: 1, closed: 0, dead: 0 },
      total_value: 441000, avg_days_in_pipeline: 8,
    }),
  }

  // ── Chat ──
  a.chat = {
    history: () => mock({ messages: [] }),
    sessions: () => mock({ sessions: [] }),
  }

  // ── Portfolio ──
  a.portfolio = {
    summary: () => mock({ entries: [], total_invested: 748000, total_value: 1088000, total_profit: 0 }),
    addEntry: (data: AnyApi) => mock({ id: crypto.randomUUID(), ...data }),
    update: (_id: string, data: AnyApi) => mock({ id: _id, ...data }),
  }

  a.portfolioV2 = {
    overview: () => mock(MOCK_PORTFOLIO_OVERVIEW),
  }

  // ── Documents ──
  a.documents = {
    list: () => mock(MOCK_DOCUMENTS),
    get: () => notFound('No document'),
    upload: () => mock({ id: crypto.randomUUID(), filename: 'demo.pdf', status: 'processing' }),
    status: () => mock({ status: 'complete' }),
    delete: () => mock({ message: 'ok' }),
  }

  // ── Offer Letter ──
  a.offerLetter = {
    generate: () => mock({ content: 'Demo offer letter content...' }),
  }

  // ── Notifications ──
  a.notifications = {
    get: () => mock({ email_deal_updates: true, email_weekly_summary: true, push_enabled: false }),
    update: (prefs: AnyApi) => mock(prefs),
  }

  // ── Recent Activity ──
  a.recentActivity = {
    list: () => mock(MOCK_TODAY.recent_activity),
  }

  // ── Properties ──
  a.properties = {
    list: () => mock({
      data: MOCK_PROPERTIES, total: MOCK_PROPERTIES.length,
      page: 1, per_page: 20, total_pages: 1,
    }),
    get: (id: string) => {
      const p = MOCK_PROPERTIES.find((x) => x.id === id)
      return p ? mock({ ...p, scenarios: [] }) : notFound('Property not found')
    },
    update: (id: string, data: AnyApi) => {
      const p = MOCK_PROPERTIES.find((x) => x.id === id)
      return p ? mock({ ...p, ...data }) : notFound()
    },
    delete: () => mock(undefined),
    scenarios: () => mock([]),
    createScenario: () => mock({ id: crypto.randomUUID(), strategy: 'wholesale' }),
    activity: () => mock([]),
  }

  // ── Tasks ──
  a.tasks = {
    list: () => mock({
      data: MOCK_TASKS, total: MOCK_TASKS.length,
      page: 1, per_page: 20, total_pages: 1,
    }),
    get: (id: string) => {
      const t = MOCK_TASKS.find((x) => x.id === id)
      return t ? mock(t) : notFound()
    },
    today: () => mock({ due_today: MOCK_TASKS.filter((t) => t.status === 'due'), overdue: MOCK_TASKS.filter((t) => t.priority === 'urgent'), total_due: 2, total_overdue: 1 }),
    create: (data: AnyApi) => mock({ id: crypto.randomUUID(), ...data, created_at: new Date().toISOString() }),
    update: (id: string, data: AnyApi) => mock({ id, ...data }),
    delete: () => mock(undefined),
    complete: (id: string) => mock({ id, status: 'done' }),
    snooze: (id: string) => mock({ id, status: 'snoozed' }),
  }

  // ── Contacts ──
  a.contacts = {
    list: () => mock({
      data: MOCK_CONTACTS, total: MOCK_CONTACTS.length,
      page: 1, per_page: 20, total_pages: 1,
    }),
    get: (id: string) => {
      const c = MOCK_CONTACTS.find((x) => x.id === id)
      return c ? mock({ ...c, tags: [], properties: [], deals: [] }) : notFound()
    },
    create: (data: AnyApi) => mock({ id: crypto.randomUUID(), ...data, created_at: new Date().toISOString() }),
    update: (id: string, data: AnyApi) => mock({ id, ...data }),
    delete: () => mock(undefined),
    communications: () => mock([]),
    logCommunication: (data: AnyApi) => mock({ id: crypto.randomUUID(), ...data }),
    deals: () => mock([]),
    linkDeal: () => mock({ message: 'ok' }),
    unlinkDeal: () => mock(undefined),
  }

  // ── Analysis ──
  a.analysis = {
    quick: () => mock({ property_id: crypto.randomUUID(), status: 'analyzing' }),
    calculate: () => mock({
      cash_flow: 450, cap_rate: 8.2, coc_return: 12.4, dscr: 1.35,
      monthly_income: 1250, monthly_expenses: 800, noi: 5400,
    }),
    saveAsProperty: () => mock({ property_id: crypto.randomUUID() }),
    regenerateNarrative: () => mock({ narrative: 'Demo narrative...' }),
    getComps: () => mock({ comps: [], repairs: [], renovation_score: null, share_link: null, after_repair_value: null, repair_cost: null }),
    compare: () => mock({ strategies: [] }),
  }

  // ── Onboarding ──
  a.onboarding = {
    status: () => mock({ completed: true, persona: 'hybrid', has_sample_data: false, has_real_data: true, real_property_count: 5 }),
    setPersona: () => mock({ persona: 'hybrid', properties_created: 0 }),
    clearSampleData: () => mock({ message: 'ok', count: 0 }),
  }

  // ── Reports ──
  a.reports = {
    list: () => mock(MOCK_REPORTS),
    get: () => notFound('No report'),
    create: (data: AnyApi) => mock({ id: crypto.randomUUID(), ...data }),
    update: (_id: string, data: AnyApi) => mock(data),
    delete: () => mock({ message: 'ok' }),
    getShared: () => notFound('No shared report'),
    logView: () => Promise.resolve(new Response()),
    triggerPdf: () => mock({ status: 'generating' }),
    pdfStatus: () => mock({ status: 'complete' }),
  }

  // ── Billing ──
  a.billing = {
    status: () => mock({
      plan: 'pro', status: 'active', interval: 'monthly',
      current_period_end: new Date(Date.now() + 25 * 86_400_000).toISOString(),
      cancel_at_period_end: false, trial_ends_at: null, trial_active: false, usage: [],
    }),
    checkout: () => mock({ url: '/pricing' }),
    portal: () => mock({ url: '/settings' }),
    cancel: () => mock({ status: 'canceled' }),
  }

  // ── Financing ──
  a.financing = {
    instruments: {
      list: () => mock({ data: MOCK_INSTRUMENTS, total: MOCK_INSTRUMENTS.length, page: 1, per_page: 20, total_pages: 1 }),
      get: (id: string) => {
        const inst = MOCK_INSTRUMENTS.find((x) => x.id === id)
        return inst ? mock({ ...inst, obligations: MOCK_OBLIGATIONS.filter((o) => o.instrument_id === id), payments: [] }) : notFound()
      },
      create: (data: AnyApi) => mock({ id: crypto.randomUUID(), ...data }),
      update: (_id: string, data: AnyApi) => mock(data),
      delete: () => mock(undefined),
    },
    obligations: {
      list: () => mock({ data: MOCK_OBLIGATIONS, total: MOCK_OBLIGATIONS.length, page: 1, per_page: 20, total_pages: 1 }),
      upcoming: () => mock({
        overdue: MOCK_OBLIGATIONS.filter((o) => o.severity === 'high'),
        this_week: MOCK_OBLIGATIONS.filter((o) => o.status === 'active' && o.severity === 'normal'),
        this_month: [],
        later: [],
      }),
      update: (_id: string, data: AnyApi) => mock(data),
      complete: (id: string, data: AnyApi) => mock({ id, status: 'completed', ...data }),
    },
    payments: {
      list: () => mock({ data: [], total: 0, page: 1, per_page: 20, total_pages: 0 }),
      create: (data: AnyApi) => mock({ id: crypto.randomUUID(), ...data }),
      summary: () => mock({ total_paid: 4835, total_due: 2751, months_data: [] }),
    },
    dashboard: () => mock({
      total_debt: 403500,
      total_monthly_payments: 2751,
      instruments_count: 2,
      obligations_due_count: 2,
      next_balloon: { instrument_id: MOCK_INSTRUMENTS[1].id, name: MOCK_INSTRUMENTS[1].name, date: '2031-01-15', amount: 248000 },
    }),
  }

  // ── Transactions ──
  a.transactions = {
    list: () => mock({
      data: MOCK_TRANSACTIONS, total: MOCK_TRANSACTIONS.length,
      page: 1, per_page: 20, total_pages: 1,
    }),
    create: (data: AnyApi) => mock({ id: crypto.randomUUID(), ...data }),
    update: (_id: string, data: AnyApi) => mock(data),
    delete: () => mock(undefined),
    summary: () => mock({
      total_income: 3450, total_expenses: 14356, net: -10906,
      by_category: { rental_income: 3450, mortgage: 2751, repairs: 8850, utilities: 185, taxes: 1120, insurance: 1450 },
      monthly: [],
    }),
    bulkCreate: () => mock({ created: 0, errors: [] }),
  }

  // ── Rehab ──
  a.rehab = {
    projects: {
      list: () => mock(MOCK_REHAB_PROJECTS),
      get: (id: string) => {
        const p = MOCK_REHAB_PROJECTS.find((x) => x.id === id)
        if (!p) return notFound()
        const items = MOCK_REHAB_ITEMS.filter((i) => i.project_id === id)
        return mock({ ...p, items })
      },
      create: (data: AnyApi) => mock({ id: crypto.randomUUID(), ...data }),
      update: (_id: string, data: AnyApi) => mock(data),
      delete: () => mock(undefined),
      summary: (id: string) => {
        const items = MOCK_REHAB_ITEMS.filter((i) => i.project_id === id)
        return mock({
          total_estimated: items.reduce((s, i) => s + i.estimated_cost, 0),
          total_actual: items.reduce((s, i) => s + (i.actual_cost ?? 0), 0),
          completion_pct: items.filter((i) => i.status === 'completed').length / items.length * 100,
          by_category: [],
        })
      },
    },
    items: {
      create: (_pId: string, data: AnyApi) => mock({ id: crypto.randomUUID(), ...data }),
      update: (_pId: string, _iId: string, data: AnyApi) => mock(data),
      delete: () => mock(undefined),
      bulkCreate: () => mock([]),
    },
  }

  // ── Buyers ──
  a.buyers = {
    list: () => mock(MOCK_BUYERS),
    get: (contactId: string) => {
      const b = MOCK_BUYERS.find((x) => x.contact_id === contactId)
      return b ? mock(b) : notFound()
    },
    quickAdd: (data: AnyApi) => mock({ id: crypto.randomUUID(), ...data }),
    matches: () => mock([]),
    buyBoxes: {
      create: (_cId: string, data: AnyApi) => mock({ id: crypto.randomUUID(), ...data }),
      update: (_cId: string, _bId: string, data: AnyApi) => mock(data),
      delete: () => mock(undefined),
    },
  }

  // ── Dispositions ──
  a.dispositions = {
    matchProperty: () => mock({ property: MOCK_PROPERTIES[0], matches: [], total: 0 }),
    matchBuyer: () => mock({ buyer: MOCK_BUYERS[0], matches: [], total: 0 }),
    matchPreview: () => mock({ matches: [], total: 0 }),
    packets: {
      create: () => mock({ id: crypto.randomUUID(), share_url: '/packets/view/demo' }),
      list: () => mock([]),
      send: () => mock({ sent: 1, errors: [] }),
    },
    sharedPacket: () => notFound('No shared packet'),
  }

  // ── Communications ──
  a.communications = {
    sendSMS: () => mock({ id: crypto.randomUUID(), channel: 'sms', status: 'sent' }),
    sendEmail: () => mock({ id: crypto.randomUUID(), channel: 'email', status: 'sent' }),
    thread: () => mock({ contact: MOCK_CONTACTS[0], messages: [] }),
  }

  // ── Sequences ──
  a.sequences = {
    list: () => mock(MOCK_SEQUENCES),
    get: () => notFound('No sequence'),
    create: (data: AnyApi) => mock({ id: crypto.randomUUID(), ...data, steps: [] }),
    update: (_id: string, data: AnyApi) => mock(data),
    delete: () => mock(undefined),
    steps: {
      add: () => mock({ id: crypto.randomUUID() }),
      update: () => mock({}),
      delete: () => mock(undefined),
    },
    enroll: () => mock({ id: crypto.randomUUID(), status: 'active' }),
    enrollBulk: () => mock({ enrolled: 0, errors: [] }),
    stopEnrollment: () => mock(undefined),
    enrollments: () => mock({ enrollments: [], total: 0 }),
    analytics: () => mock({ total_enrolled: 0, active: 0, completed: 0, replied: 0, stopped: 0, failed: 0 }),
  }

  // ── Skip Tracing ──
  a.skipTracing = {
    trace: () => mock({ id: crypto.randomUUID(), status: 'found', phones: [], emails: [], owner_name: null, absentee: false }),
    traceBatch: () => mock({ batch_id: crypto.randomUUID(), status: 'processing', total: 0 }),
    batchStatus: () => mock({ status: 'complete', total: 0, found: 0, not_found: 0, results: [] }),
    history: () => mock({ items: MOCK_SKIP_TRACES, total: 0 }),
    get: () => notFound('No trace'),
    createContact: () => mock({ contact_id: crypto.randomUUID(), created: true }),
    usage: () => mock({ used: 0, limit: 25, resets_at: new Date(Date.now() + 25 * 86_400_000).toISOString() }),
  }

  // ── Mail Campaigns ──
  a.mailCampaigns = {
    list: () => mock(MOCK_MAIL_CAMPAIGNS),
    get: () => notFound('No campaign'),
    create: (data: AnyApi) => mock({ id: crypto.randomUUID(), ...data, status: 'draft', recipients: [] }),
    update: (_id: string, data: AnyApi) => mock(data),
    delete: () => mock(undefined),
    addRecipients: () => mock([]),
    removeRecipient: () => mock(undefined),
    verify: () => mock({ total: 0, deliverable: 0, undeliverable: 0, no_match: 0 }),
    send: () => mock({ status: 'sending' }),
    cancel: () => mock({ status: 'cancelled' }),
    preview: () => mock({ front_html: '<p>Preview</p>', back_html: '<p>Back</p>' }),
    analytics: () => mock({ total_recipients: 0, total_sent: 0, total_delivered: 0, total_returned: 0, total_cost_cents: 0, delivery_rate: 0, return_rate: 0 }),
    quickSend: () => mock({ lob_id: 'psc_demo', status: 'sent' }),
  }

  console.warn('⚠️ DEV PREVIEW MODE — mock data, no backend')
}
