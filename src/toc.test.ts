import { describe, expect, it } from 'vitest'
import { extractToc } from './toc'

describe('extractToc', () => {
  it('keeps Korean headings, levels, and unique ids', () => {
    expect(extractToc('# 소개\n## 같은 제목\n### 같은 제목\n## **굵은** `코드`')).toEqual([
      { id: '소개', level: 1, text: '소개' },
      { id: '같은-제목', level: 2, text: '같은 제목' },
      { id: '같은-제목-1', level: 3, text: '같은 제목' },
      { id: '굵은-코드', level: 2, text: '굵은 코드' },
    ])
  })

  it('ignores heading-looking text inside code fences', () => {
    expect(extractToc('```md\n# 코드 제목\n```\n# 실제 제목')).toEqual([
      { id: '실제-제목', level: 1, text: '실제 제목' },
    ])
  })

  it('keeps ids aligned when hidden heading levels consume a duplicate slug', () => {
    expect(extractToc('#### Intro\n\n## Intro')).toEqual([
      { id: 'intro-1', level: 2, text: 'Intro' },
    ])
  })

  it('matches rendered ids for images inside headings', () => {
    expect(extractToc('## ![Logo](/logo.png) title')).toEqual([
      { id: '-title', level: 2, text: 'title' },
    ])
  })
})
