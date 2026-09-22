import { describe, expect, it } from 'vitest'
import { formatCount, visitorDateLabel } from './stats'

describe('visitor statistics display', () => {
  it('labels the latest complete Korean day as yesterday', () => {
    expect(visitorDateLabel('2026-09-22', new Date('2026-09-23T01:00:00Z'))).toBe('어제 방문')
  })

  it('shows the actual date when the snapshot has not refreshed', () => {
    expect(visitorDateLabel('2026-09-21', new Date('2026-09-23T01:00:00Z'))).toBe('2026-09-21 방문')
  })

  it('does not turn unavailable counts into zero', () => {
    expect(formatCount(null)).toBe('—')
    expect(formatCount(undefined)).toBe('—')
    expect(formatCount(1284)).toBe('1,284')
  })
})
