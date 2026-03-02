/** Unit tests for the useCountUp custom hook. */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountUp } from '@/hooks/useCountUp'

describe('useCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts at zero and reaches the target value after the animation duration', () => {
    let rafCallbacks: FrameRequestCallback[] = []
    let rafId = 0

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb)
      return ++rafId
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
      /* noop */
    })

    const { result } = renderHook(() => useCountUp(100, 1200))

    // Initially starts at 0
    expect(result.current).toBe(0)

    // Simulate the first rAF call at time 0 (sets startRef)
    act(() => {
      const cb = rafCallbacks.shift()
      if (cb) cb(0)
    })

    // Simulate final rAF call at time >= duration (progress = 1, eased = 1)
    act(() => {
      const cb = rafCallbacks.shift()
      if (cb) cb(1200)
    })

    expect(result.current).toBe(100)
  })

  it('works with different target values', () => {
    let rafCallbacks: FrameRequestCallback[] = []
    let rafId = 0

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb)
      return ++rafId
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
      /* noop */
    })

    const { result } = renderHook(() => useCountUp(50, 1200))

    expect(result.current).toBe(0)

    act(() => {
      const cb = rafCallbacks.shift()
      if (cb) cb(0)
    })

    // Simulate at half duration: progress=0.5, eased = 1 - (0.5)^3 = 0.875
    act(() => {
      const cb = rafCallbacks.shift()
      if (cb) cb(600)
    })

    // At halfway, eased value = 50 * 0.875 = 43.75
    expect(result.current).toBeCloseTo(43.75, 1)

    // Drain remaining callbacks to reach target
    act(() => {
      const cb = rafCallbacks.shift()
      if (cb) cb(1200)
    })

    expect(result.current).toBe(50)
  })
})
