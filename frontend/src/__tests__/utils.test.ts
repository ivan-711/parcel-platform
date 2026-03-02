/** Unit tests for shared formatting utilities in lib/format.ts and lib/utils.ts. */

import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPercent,
  formatLabel,
  formatOutputValue,
  formatFileSize,
} from '@/lib/format'

describe('formatCurrency', () => {
  it('formats positive numbers as USD without decimals', () => {
    expect(formatCurrency(250000)).toBe('$250,000')
  })

  it('returns em-dash for null, undefined, and NaN', () => {
    expect(formatCurrency(null)).toBe('\u2014')
    expect(formatCurrency(undefined)).toBe('\u2014')
    expect(formatCurrency('not-a-number')).toBe('\u2014')
  })

  it('formats negative numbers with a minus sign', () => {
    const result = formatCurrency(-1500)
    expect(result).toContain('1,500')
    expect(result).toContain('-')
  })

  it('parses string inputs correctly', () => {
    expect(formatCurrency('45000')).toBe('$45,000')
  })

  it('formats zero as $0', () => {
    expect(formatCurrency(0)).toBe('$0')
  })
})

describe('formatPercent', () => {
  it('formats a number with two decimal places and a percent sign', () => {
    expect(formatPercent(8.5)).toBe('8.50%')
  })

  it('returns em-dash for null/undefined', () => {
    expect(formatPercent(null)).toBe('\u2014')
    expect(formatPercent(undefined)).toBe('\u2014')
  })

  it('handles zero correctly', () => {
    expect(formatPercent(0)).toBe('0.00%')
  })

  it('handles negative percentages', () => {
    expect(formatPercent(-3.14)).toBe('-3.14%')
  })
})

describe('formatLabel', () => {
  it('converts snake_case keys to Title Case', () => {
    expect(formatLabel('purchase_price')).toBe('Purchase Price')
  })

  it('uses domain-specific overrides', () => {
    expect(formatLabel('mao')).toBe('MAO')
    expect(formatLabel('arv')).toBe('ARV')
    expect(formatLabel('coc_return')).toBe('Cash-on-Cash Return')
    expect(formatLabel('annual_noi')).toBe('Annual NOI')
  })

  it('handles single-word keys', () => {
    expect(formatLabel('profit')).toBe('Profit')
  })
})

describe('formatOutputValue', () => {
  it('formats percent keys using formatPercent', () => {
    expect(formatOutputValue('cap_rate', 6.25)).toBe('6.25%')
  })

  it('formats currency keys using formatCurrency', () => {
    const result = formatOutputValue('purchase_price', 350000)
    expect(result).toBe('$350,000')
  })

  it('returns infinity symbol for null percent keys', () => {
    expect(formatOutputValue('cap_rate', null)).toBe('\u221E')
  })

  it('returns N/A for null non-percent keys', () => {
    expect(formatOutputValue('some_value', null)).toBe('N/A')
  })

  it('formats finance_type string values as Title Case', () => {
    expect(formatOutputValue('finance_type', 'subject_to')).toBe('Subject To')
    expect(formatOutputValue('finance_type', 'seller_finance')).toBe('Seller Finance')
  })
})

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('formats kilobytes correctly', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('formats megabytes correctly', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB')
  })
})
