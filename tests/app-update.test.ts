import { describe, expect, it } from 'vitest'
import { isNewerVersion } from '../shared/appUpdate'

describe('isNewerVersion', () => {
  it('detects newer versions segment-wise', () => {
    expect(isNewerVersion('0.1.2', '0.1.1')).toBe(true)
    expect(isNewerVersion('0.2.0', '0.1.9')).toBe(true)
    expect(isNewerVersion('1.0.0', '0.9.9')).toBe(true)
    expect(isNewerVersion('10.0.0', '9.0.0')).toBe(true)
  })

  it('returns false for equal or older versions', () => {
    expect(isNewerVersion('0.1.1', '0.1.1')).toBe(false)
    expect(isNewerVersion('0.1.0', '0.1.1')).toBe(false)
    expect(isNewerVersion('0.0.9', '0.1.0')).toBe(false)
  })

  it('treats missing segments as zero', () => {
    expect(isNewerVersion('0.1.1.1', '0.1.1')).toBe(true)
    expect(isNewerVersion('0.1', '0.1.0')).toBe(false)
    expect(isNewerVersion('0.2', '0.1.5')).toBe(true)
  })

  it('returns false for malformed versions', () => {
    expect(isNewerVersion('abc', '0.1.1')).toBe(false)
    expect(isNewerVersion('0.1.2', 'dev')).toBe(false)
    expect(isNewerVersion('', '0.1.1')).toBe(false)
  })
})
