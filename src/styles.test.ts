import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('mobile text-only post rows', () => {
  it('restores a single column after the mobile row rule', () => {
    const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')
    const mobile = css.slice(css.indexOf('@media (max-width: 650px)'))
    const mobileRow = mobile.indexOf('.post-row {')
    const textOnly = mobile.indexOf('.post-row-text-only', mobileRow)
    expect(textOnly).toBeGreaterThan(mobileRow)
    expect(mobile.slice(textOnly, mobile.indexOf('}', textOnly) + 1)).toContain('grid-template-columns: minmax(0, 1fr)')
  })
})
