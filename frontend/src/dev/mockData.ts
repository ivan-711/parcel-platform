/**
 * Mock data for DEV_PREVIEW mode — realistic Parcel Platform demo data.
 * Wisconsin-focused real estate investment data.
 */

import type { User } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uid = (n: number) => `00000000-0000-4000-a000-00000000000${n}`
const now = new Date().toISOString()
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString()
const dateOnly = (iso: string) => iso.split('T')[0]

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export const MOCK_USER: User = {
  id: uid(1),
  name: 'Ivan Flores',
  email: 'ivan@parceldesk.io',
  role: 'investor',
  team_id: null,
  plan_tier: 'pro',
  trial_ends_at: null,
  trial_active: false,
  created_at: daysAgo(120),
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

export const MOCK_PROPERTIES = [
  {
    id: uid(10),
    address: '2431 N Fratney St',
    city: 'Milwaukee',
    state: 'WI',
    zip_code: '53212',
    property_type: 'single_family',
    bedrooms: 3,
    bathrooms: 1.5,
    sqft: 1420,
    lot_sqft: 4200,
    year_built: 1922,
    estimated_value: 185000,
    purchase_price: 142000,
    monthly_rent: 1250,
    status: 'active',
    strategy: 'buy_and_hold',
    created_by: uid(1),
    created_at: daysAgo(45),
    updated_at: daysAgo(2),
    notes: 'Solid Riverwest SFH, new roof 2024.',
    is_sample: false,
    scenarios: [],
  },
  {
    id: uid(11),
    address: '1815 S 29th St',
    city: 'Milwaukee',
    state: 'WI',
    zip_code: '53215',
    property_type: 'duplex',
    bedrooms: 5,
    bathrooms: 2,
    sqft: 2200,
    lot_sqft: 3800,
    year_built: 1948,
    estimated_value: 210000,
    purchase_price: 165000,
    monthly_rent: 1900,
    status: 'active',
    strategy: 'brrrr',
    created_by: uid(1),
    created_at: daysAgo(30),
    updated_at: daysAgo(5),
    notes: 'Up/down duplex. Upper rented $950, lower vacant.',
    is_sample: false,
    scenarios: [],
  },
  {
    id: uid(12),
    address: '4520 W Burleigh St',
    city: 'Milwaukee',
    state: 'WI',
    zip_code: '53210',
    property_type: 'single_family',
    bedrooms: 4,
    bathrooms: 2,
    sqft: 1680,
    lot_sqft: 5100,
    year_built: 1935,
    estimated_value: 145000,
    purchase_price: 89000,
    monthly_rent: 1100,
    status: 'under_contract',
    strategy: 'wholesale',
    created_by: uid(1),
    created_at: daysAgo(10),
    updated_at: daysAgo(1),
    notes: 'Motivated seller — estate sale. Needs cosmetic rehab.',
    is_sample: false,
    scenarios: [],
  },
  {
    id: uid(13),
    address: '312 E Washington Ave',
    city: 'Madison',
    state: 'WI',
    zip_code: '53703',
    property_type: 'multi_family',
    bedrooms: 8,
    bathrooms: 4,
    sqft: 3600,
    lot_sqft: 6200,
    year_built: 1910,
    estimated_value: 420000,
    purchase_price: 280000,
    monthly_rent: 3200,
    status: 'analyzing',
    strategy: 'creative_finance',
    created_by: uid(1),
    created_at: daysAgo(3),
    updated_at: daysAgo(1),
    notes: '4-unit near Capitol. Seller open to sub-to.',
    is_sample: false,
    scenarios: [],
  },
  {
    id: uid(14),
    address: '728 Superior Ave',
    city: 'Sheboygan',
    state: 'WI',
    zip_code: '53081',
    property_type: 'single_family',
    bedrooms: 3,
    bathrooms: 1,
    sqft: 1100,
    lot_sqft: 4800,
    year_built: 1955,
    estimated_value: 128000,
    purchase_price: 72000,
    monthly_rent: 850,
    status: 'active',
    strategy: 'flip',
    created_by: uid(1),
    created_at: daysAgo(60),
    updated_at: daysAgo(15),
    notes: 'Flip in progress — kitchen done, bath next.',
    is_sample: false,
    scenarios: [],
  },
]

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export const MOCK_CONTACTS = [
  { id: uid(20), name: 'Maria Gonzalez', email: 'maria@email.com', phone: '+14145551001', type: 'seller' as const, company: null, notes: 'Owns Burleigh property', created_at: daysAgo(10), updated_at: daysAgo(1), is_deleted: false, opted_out_sms: false },
  { id: uid(21), name: 'James Chen', email: 'james.chen@invest.com', phone: '+14145552002', type: 'buyer' as const, company: 'Chen Capital LLC', notes: 'Cash buyer, SFH focus, $80-180K range', created_at: daysAgo(30), updated_at: daysAgo(5), is_deleted: false, opted_out_sms: false },
  { id: uid(22), name: 'Sarah Mitchell', email: 'sarah@mke-realty.com', phone: '+14145553003', type: 'agent' as const, company: 'MKE Realty Group', notes: 'Great for comps in Riverwest/Bay View', created_at: daysAgo(60), updated_at: daysAgo(20), is_deleted: false, opted_out_sms: false },
  { id: uid(23), name: 'Robert Davis', email: 'rdavis@lendcorp.com', phone: '+16085554004', type: 'lender' as const, company: 'LendCorp Financial', notes: 'Hard money — 12% rate, 2pt origination, up to 75% ARV', created_at: daysAgo(90), updated_at: daysAgo(40), is_deleted: false, opted_out_sms: false },
  { id: uid(24), name: 'Patricia Williams', email: 'pwilliams@gmail.com', phone: '+14145555005', type: 'seller' as const, company: null, notes: 'Inherited Sheboygan property, motivated', created_at: daysAgo(55), updated_at: daysAgo(15), is_deleted: false, opted_out_sms: false },
  { id: uid(25), name: 'Marcus Johnson', email: 'marcus.j@buyerco.com', phone: '+14145556006', type: 'buyer' as const, company: 'Midwest Flip Partners', notes: 'Likes duplexes, $150-250K', created_at: daysAgo(20), updated_at: daysAgo(3), is_deleted: false, opted_out_sms: false },
  { id: uid(26), name: 'Angela Torres', email: 'atorres@contractall.com', phone: '+14145557007', type: 'contractor' as const, company: 'ContractAll Services', notes: 'General contractor — good pricing, reliable', created_at: daysAgo(100), updated_at: daysAgo(30), is_deleted: false, opted_out_sms: false },
  { id: uid(27), name: 'David Park', email: 'dpark@tenantmail.com', phone: '+14145558008', type: 'tenant' as const, company: null, notes: 'Tenant at Fratney St upper unit', created_at: daysAgo(40), updated_at: daysAgo(40), is_deleted: false, opted_out_sms: false },
]

// ---------------------------------------------------------------------------
// Pipeline deals
// ---------------------------------------------------------------------------

export const MOCK_PIPELINE: Record<string, Array<{
  id: string; deal_id: string; stage: string; notes: string | null; created_at: string
  deal: { id: string; address: string; city: string; state: string; zip_code: string; strategy: string; purchase_price: number; arv: number | null }
}>> = {
  lead: [
    {
      id: uid(30), deal_id: uid(40), stage: 'lead', notes: 'Found via driving for dollars', created_at: daysAgo(8),
      deal: { id: uid(40), address: '4520 W Burleigh St', city: 'Milwaukee', state: 'WI', zip_code: '53210', strategy: 'wholesale', purchase_price: 89000, arv: 145000 },
    },
  ],
  contacted: [
    {
      id: uid(31), deal_id: uid(41), stage: 'contacted', notes: 'Left voicemail, texted', created_at: daysAgo(5),
      deal: { id: uid(41), address: '312 E Washington Ave', city: 'Madison', state: 'WI', zip_code: '53703', strategy: 'creative_finance', purchase_price: 280000, arv: 420000 },
    },
  ],
  negotiating: [],
  under_contract: [
    {
      id: uid(32), deal_id: uid(42), stage: 'under_contract', notes: 'Inspection scheduled for Monday', created_at: daysAgo(2),
      deal: { id: uid(42), address: '728 Superior Ave', city: 'Sheboygan', state: 'WI', zip_code: '53081', strategy: 'flip', purchase_price: 72000, arv: 128000 },
    },
  ],
  closed: [],
  dead: [],
}

// ---------------------------------------------------------------------------
// Financing instruments
// ---------------------------------------------------------------------------

export const MOCK_INSTRUMENTS = [
  {
    id: uid(50),
    property_id: uid(11),
    deal_id: null,
    created_by: uid(1),
    team_id: null,
    name: 'Sub-To on 29th St Duplex',
    instrument_type: 'sub_to_mortgage',
    position: 1,
    status: 'active',
    original_balance: 142000,
    current_balance: 128500,
    interest_rate: 3.875,
    rate_type: 'fixed',
    term_months: 360,
    amortization_months: 360,
    monthly_payment: 667,
    origination_date: '2020-03-15',
    maturity_date: '2050-03-15',
    first_payment_date: '2020-04-15',
    has_balloon: false,
    balloon_date: null,
    balloon_amount: null,
    is_sub_to: true,
    original_borrower: 'Previous Owner LLC',
    servicer: 'US Bank',
    loan_number_last4: '4821',
    due_on_sale_risk: 'moderate',
    is_wrap: false,
    underlying_instrument_id: null,
    wrap_rate: null,
    wrap_payment: null,
    option_consideration: null,
    option_expiration: null,
    monthly_credit: null,
    strike_price: null,
    down_payment: null,
    late_fee_pct: null,
    late_fee_grace_days: null,
    prepayment_penalty: false,
    requires_insurance: true,
    insurance_verified_date: daysAgo(30).split('T')[0],
    escrow_amount: 185,
    terms_extended: null,
    notes: 'Insurance and taxes escrowed. Payment includes P&I only.',
    created_at: daysAgo(30),
    updated_at: daysAgo(5),
    months_remaining: 288,
    next_payment_due: daysFromNow(10).split('T')[0],
    payoff_amount_estimate: 128500,
    wrap_spread: null,
  },
  {
    id: uid(51),
    property_id: uid(13),
    deal_id: null,
    created_by: uid(1),
    team_id: null,
    name: 'Seller Finance — Washington Ave 4-Unit',
    instrument_type: 'seller_finance',
    position: 1,
    status: 'active',
    original_balance: 280000,
    current_balance: 275000,
    interest_rate: 6.5,
    rate_type: 'fixed',
    term_months: 60,
    amortization_months: 240,
    monthly_payment: 2084,
    origination_date: daysAgo(90).split('T')[0],
    maturity_date: '2031-01-15',
    first_payment_date: daysAgo(60).split('T')[0],
    has_balloon: true,
    balloon_date: '2031-01-15',
    balloon_amount: 248000,
    is_sub_to: false,
    original_borrower: null,
    servicer: null,
    loan_number_last4: null,
    due_on_sale_risk: null,
    is_wrap: false,
    underlying_instrument_id: null,
    wrap_rate: null,
    wrap_payment: null,
    option_consideration: null,
    option_expiration: null,
    monthly_credit: null,
    strike_price: null,
    down_payment: 28000,
    late_fee_pct: 5,
    late_fee_grace_days: 10,
    prepayment_penalty: false,
    requires_insurance: true,
    insurance_verified_date: daysAgo(60).split('T')[0],
    escrow_amount: null,
    terms_extended: null,
    notes: '5-year balloon. Seller open to extension if performing.',
    created_at: daysAgo(90),
    updated_at: daysAgo(10),
    months_remaining: 55,
    next_payment_due: daysFromNow(5).split('T')[0],
    payoff_amount_estimate: 275000,
    wrap_spread: null,
  },
]

// ---------------------------------------------------------------------------
// Obligations
// ---------------------------------------------------------------------------

export const MOCK_OBLIGATIONS = [
  {
    id: uid(60),
    instrument_id: uid(50),
    property_id: uid(11),
    obligation_type: 'monthly_payment',
    title: 'Sub-To Monthly Payment',
    description: 'P&I payment to US Bank',
    amount: 667,
    due_date: daysFromNow(10).split('T')[0],
    status: 'active',
    severity: 'normal',
    completed_at: null,
    completed_amount: null,
    notes: null,
    created_at: daysAgo(30),
    updated_at: daysAgo(1),
    instrument_name: 'Sub-To on 29th St Duplex',
    property_address: '1815 S 29th St',
  },
  {
    id: uid(61),
    instrument_id: uid(51),
    property_id: uid(13),
    obligation_type: 'monthly_payment',
    title: 'Seller Finance Payment',
    description: 'Monthly payment to seller',
    amount: 2084,
    due_date: daysAgo(3).split('T')[0],
    status: 'active',
    severity: 'high',
    completed_at: null,
    completed_amount: null,
    notes: 'Overdue — pay ASAP to avoid late fee',
    created_at: daysAgo(30),
    updated_at: daysAgo(1),
    instrument_name: 'Seller Finance — Washington Ave 4-Unit',
    property_address: '312 E Washington Ave',
  },
  {
    id: uid(62),
    instrument_id: uid(50),
    property_id: uid(11),
    obligation_type: 'insurance_renewal',
    title: 'Insurance Renewal — 29th St',
    description: 'Annual hazard insurance renewal',
    amount: 1450,
    due_date: daysAgo(15).split('T')[0],
    status: 'completed',
    severity: 'normal',
    completed_at: daysAgo(16),
    completed_amount: 1450,
    notes: 'Renewed with State Farm',
    created_at: daysAgo(45),
    updated_at: daysAgo(16),
    instrument_name: 'Sub-To on 29th St Duplex',
    property_address: '1815 S 29th St',
  },
]

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export const MOCK_TASKS = [
  { id: uid(70), title: 'Call Maria Gonzalez — follow up on Burleigh offer', status: 'due' as const, priority: 'high' as const, due_date: dateOnly(now), property_id: uid(12), contact_id: uid(20), deal_id: null, created_at: daysAgo(2), updated_at: daysAgo(1), notes: null },
  { id: uid(71), title: 'Schedule inspection — Sheboygan flip', status: 'open' as const, priority: 'normal' as const, due_date: dateOnly(daysFromNow(2)), property_id: uid(14), contact_id: null, deal_id: uid(42), created_at: daysAgo(1), updated_at: daysAgo(1), notes: null },
  { id: uid(72), title: 'Send comps to James Chen', status: 'open' as const, priority: 'normal' as const, due_date: dateOnly(daysFromNow(5)), property_id: null, contact_id: uid(21), deal_id: null, created_at: daysAgo(3), updated_at: daysAgo(3), notes: 'He wants 3 comps for Riverwest area' },
  { id: uid(73), title: 'Pay sub-to mortgage — 29th St', status: 'due' as const, priority: 'urgent' as const, due_date: dateOnly(daysAgo(1)), property_id: uid(11), contact_id: null, deal_id: null, created_at: daysAgo(5), updated_at: daysAgo(1), notes: 'Due yesterday' },
  { id: uid(74), title: 'Get contractor quote for bathroom — Sheboygan', status: 'open' as const, priority: 'low' as const, due_date: dateOnly(daysFromNow(10)), property_id: uid(14), contact_id: uid(26), deal_id: null, created_at: daysAgo(7), updated_at: daysAgo(7), notes: null },
]

// ---------------------------------------------------------------------------
// Rehab projects
// ---------------------------------------------------------------------------

export const MOCK_REHAB_PROJECTS = [
  {
    id: uid(80),
    property_id: uid(14),
    name: 'Sheboygan SFH Full Rehab',
    status: 'in_progress',
    budget: 32000,
    spent: 18500,
    start_date: daysAgo(45).split('T')[0],
    target_completion: daysFromNow(30).split('T')[0],
    notes: 'Kitchen complete. Bathroom and flooring remaining.',
    created_at: daysAgo(45),
    updated_at: daysAgo(2),
  },
  {
    id: uid(81),
    property_id: uid(11),
    name: '29th St Duplex — Lower Unit Turn',
    status: 'planning',
    budget: 8500,
    spent: 0,
    start_date: daysFromNow(14).split('T')[0],
    target_completion: daysFromNow(45).split('T')[0],
    notes: 'Paint, flooring, fixtures. Tenant vacated.',
    created_at: daysAgo(5),
    updated_at: daysAgo(5),
  },
]

export const MOCK_REHAB_ITEMS = [
  { id: uid(90), project_id: uid(80), category: 'Kitchen', description: 'Cabinet refacing + countertops', estimated_cost: 6500, actual_cost: 6200, status: 'completed', vendor: 'ContractAll Services', notes: null, created_at: daysAgo(40), updated_at: daysAgo(20) },
  { id: uid(91), project_id: uid(80), category: 'Kitchen', description: 'Appliance package (range, fridge, dishwasher)', estimated_cost: 2800, actual_cost: 2650, status: 'completed', vendor: 'Home Depot', notes: 'Bought scratch & dent — saved $400', created_at: daysAgo(35), updated_at: daysAgo(18) },
  { id: uid(92), project_id: uid(80), category: 'Bathroom', description: 'Full bath remodel (tub, tile, vanity)', estimated_cost: 8000, actual_cost: null, status: 'in_progress', vendor: 'ContractAll Services', notes: 'Demo done, plumbing rough-in next', created_at: daysAgo(10), updated_at: daysAgo(2) },
  { id: uid(93), project_id: uid(80), category: 'Flooring', description: 'LVP throughout main level', estimated_cost: 4200, actual_cost: null, status: 'pending', vendor: null, notes: null, created_at: daysAgo(45), updated_at: daysAgo(45) },
  { id: uid(94), project_id: uid(80), category: 'Exterior', description: 'Landscaping and curb appeal', estimated_cost: 1500, actual_cost: null, status: 'pending', vendor: null, notes: null, created_at: daysAgo(45), updated_at: daysAgo(45) },
]

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export const MOCK_TRANSACTIONS = [
  { id: uid(100), property_id: uid(10), description: 'Rent — April 2026', amount: 1250, transaction_type: 'income', category: 'rental_income', date: dateOnly(daysAgo(5)), notes: null, created_at: daysAgo(5), updated_at: daysAgo(5) },
  { id: uid(101), property_id: uid(10), description: 'Rent — March 2026', amount: 1250, transaction_type: 'income', category: 'rental_income', date: dateOnly(daysAgo(35)), notes: null, created_at: daysAgo(35), updated_at: daysAgo(35) },
  { id: uid(102), property_id: uid(11), description: 'Rent — Upper Unit April', amount: 950, transaction_type: 'income', category: 'rental_income', date: dateOnly(daysAgo(5)), notes: null, created_at: daysAgo(5), updated_at: daysAgo(5) },
  { id: uid(103), property_id: uid(10), description: 'Water bill Q1', amount: 185, transaction_type: 'expense', category: 'utilities', date: dateOnly(daysAgo(12)), notes: null, created_at: daysAgo(12), updated_at: daysAgo(12) },
  { id: uid(104), property_id: uid(11), description: 'Sub-to mortgage payment March', amount: 667, transaction_type: 'expense', category: 'mortgage', date: dateOnly(daysAgo(35)), notes: null, created_at: daysAgo(35), updated_at: daysAgo(35) },
  { id: uid(105), property_id: uid(14), description: 'Kitchen cabinets — Sheboygan flip', amount: 6200, transaction_type: 'expense', category: 'repairs', date: dateOnly(daysAgo(20)), notes: 'ContractAll Services', created_at: daysAgo(20), updated_at: daysAgo(20) },
  { id: uid(106), property_id: uid(14), description: 'Appliance package', amount: 2650, transaction_type: 'expense', category: 'repairs', date: dateOnly(daysAgo(18)), notes: 'Home Depot scratch & dent', created_at: daysAgo(18), updated_at: daysAgo(18) },
  { id: uid(107), property_id: uid(10), description: 'Property tax Q1', amount: 1120, transaction_type: 'expense', category: 'taxes', date: dateOnly(daysAgo(25)), notes: null, created_at: daysAgo(25), updated_at: daysAgo(25) },
  { id: uid(108), property_id: uid(11), description: 'Landlord insurance annual', amount: 1450, transaction_type: 'expense', category: 'insurance', date: dateOnly(daysAgo(16)), notes: 'State Farm renewal', created_at: daysAgo(16), updated_at: daysAgo(16) },
  { id: uid(109), property_id: uid(13), description: 'Seller finance payment #2', amount: 2084, transaction_type: 'expense', category: 'mortgage', date: dateOnly(daysAgo(30)), notes: null, created_at: daysAgo(30), updated_at: daysAgo(30) },
]

// ---------------------------------------------------------------------------
// Today / Dashboard data
// ---------------------------------------------------------------------------

export const MOCK_TODAY = {
  greeting: 'Good morning',
  briefing: [
    { id: uid(200), type: 'task_due' as const, title: 'Call Maria Gonzalez — follow up on Burleigh offer', subtitle: 'High priority • Due today', icon: 'task', entity_id: uid(70), entity_type: 'task' },
    { id: uid(201), type: 'obligation_due' as const, title: 'Sub-to mortgage payment overdue', subtitle: '$667 • 1815 S 29th St', icon: 'alert', entity_id: uid(61), entity_type: 'obligation' },
    { id: uid(202), type: 'deal_update' as const, title: 'Sheboygan flip — inspection Monday', subtitle: 'Under contract • $72,000', icon: 'deal', entity_id: uid(42), entity_type: 'deal' },
  ],
  tasks_due_today: 2,
  tasks_overdue: 1,
  pipeline_summary: {
    total_deals: 3,
    total_value: 441000,
    by_stage: { lead: 1, contacted: 1, negotiating: 0, under_contract: 1, closed: 0, dead: 0 },
  },
  portfolio_summary: {
    total_properties: 5,
    total_value: 1088000,
    total_equity: 342500,
    monthly_cash_flow: 2866,
    avg_cap_rate: 8.2,
    occupancy_rate: 80,
  },
  recent_activity: [
    { type: 'property_added', description: 'Added 312 E Washington Ave, Madison', timestamp: daysAgo(3), entity_id: uid(13), entity_type: 'property' },
    { type: 'contact_created', description: 'Created contact Marcus Johnson', timestamp: daysAgo(3), entity_id: uid(25), entity_type: 'contact' },
    { type: 'deal_stage_changed', description: 'Sheboygan flip moved to Under Contract', timestamp: daysAgo(2), entity_id: uid(42), entity_type: 'deal' },
    { type: 'task_completed', description: 'Sent comps to Sarah Mitchell', timestamp: daysAgo(4), entity_id: null, entity_type: null },
    { type: 'transaction_recorded', description: 'Rent received — 2431 N Fratney St ($1,250)', timestamp: daysAgo(5), entity_id: uid(100), entity_type: 'transaction' },
  ],
}

export const MOCK_DASHBOARD_STATS = {
  total_properties: 5,
  total_deals: 3,
  active_deals: 3,
  total_value: 1088000,
  total_invested: 748000,
  total_equity: 340000,
  monthly_income: 5400,
  monthly_expenses: 2536,
  monthly_cash_flow: 2864,
  avg_cap_rate: 8.2,
  avg_coc_return: 12.4,
  recent_deals: [
    { id: uid(40), address: '4520 W Burleigh St', city: 'Milwaukee', state: 'WI', strategy: 'wholesale', status: 'active', purchase_price: 89000, created_at: daysAgo(10) },
    { id: uid(41), address: '312 E Washington Ave', city: 'Madison', state: 'WI', strategy: 'creative_finance', status: 'active', purchase_price: 280000, created_at: daysAgo(3) },
  ],
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export const MOCK_PORTFOLIO_OVERVIEW = {
  total_properties: 3,
  total_market_value: 523000,
  total_equity: 209500,
  total_debt: 313500,
  monthly_gross_income: 4100,
  monthly_expenses: 1852,
  monthly_net_income: 2248,
  avg_cap_rate: 7.8,
  avg_cash_on_cash: 11.2,
  ltv_ratio: 59.9,
  properties: [
    { id: uid(10), address: '2431 N Fratney St', city: 'Milwaukee', state: 'WI', property_type: 'single_family', market_value: 185000, equity: 85000, monthly_income: 1250, monthly_expenses: 420, cap_rate: 8.1, cash_on_cash: 12.8, occupancy: 100, status: 'performing' },
    { id: uid(11), address: '1815 S 29th St', city: 'Milwaukee', state: 'WI', property_type: 'duplex', market_value: 210000, equity: 81500, monthly_income: 950, monthly_expenses: 852, cap_rate: 5.6, cash_on_cash: 7.2, occupancy: 50, status: 'attention' },
    { id: uid(14), address: '728 Superior Ave', city: 'Sheboygan', state: 'WI', property_type: 'single_family', market_value: 128000, equity: 43000, monthly_income: 0, monthly_expenses: 580, cap_rate: 0, cash_on_cash: 0, occupancy: 0, status: 'rehab' },
  ],
}

// ---------------------------------------------------------------------------
// Sequences (empty list for now)
// ---------------------------------------------------------------------------

export const MOCK_SEQUENCES: unknown[] = []
export const MOCK_SKIP_TRACES: unknown[] = []
export const MOCK_MAIL_CAMPAIGNS: unknown[] = []

// ---------------------------------------------------------------------------
// Reports / Documents (minimal)
// ---------------------------------------------------------------------------

export const MOCK_REPORTS = {
  data: [] as unknown[],
  total: 0,
  page: 1,
  per_page: 20,
  total_pages: 0,
}

export const MOCK_DOCUMENTS = {
  data: [] as unknown[],
  total: 0,
  page: 1,
  per_page: 20,
  total_pages: 0,
}

// ---------------------------------------------------------------------------
// Buyers
// ---------------------------------------------------------------------------

export const MOCK_BUYERS = [
  {
    id: uid(21),
    contact_id: uid(21),
    name: 'James Chen',
    email: 'james.chen@invest.com',
    phone: '+14145552002',
    company: 'Chen Capital LLC',
    buy_boxes: [
      { id: uid(150), contact_id: uid(21), label: 'Milwaukee SFH', property_types: ['single_family'], strategies: ['wholesale', 'flip'], markets: ['Milwaukee, WI'], min_price: 60000, max_price: 180000, min_beds: 2, max_beds: null, funding_types: ['cash'], has_pof: true, is_active: true, created_at: daysAgo(30), updated_at: daysAgo(5) },
    ],
    total_deals: 2,
    funding_types: ['cash'],
    has_pof: true,
    created_at: daysAgo(30),
    updated_at: daysAgo(5),
  },
  {
    id: uid(25),
    contact_id: uid(25),
    name: 'Marcus Johnson',
    email: 'marcus.j@buyerco.com',
    phone: '+14145556006',
    company: 'Midwest Flip Partners',
    buy_boxes: [
      { id: uid(151), contact_id: uid(25), label: 'WI Duplexes', property_types: ['duplex', 'multi_family'], strategies: ['brrrr', 'buy_and_hold'], markets: ['Milwaukee, WI', 'Madison, WI'], min_price: 150000, max_price: 300000, min_beds: 4, max_beds: null, funding_types: ['conventional', 'hard_money'], has_pof: false, is_active: true, created_at: daysAgo(20), updated_at: daysAgo(3) },
    ],
    total_deals: 0,
    funding_types: ['conventional', 'hard_money'],
    has_pof: false,
    created_at: daysAgo(20),
    updated_at: daysAgo(3),
  },
]
