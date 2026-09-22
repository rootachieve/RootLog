import { describe, expect, it } from 'vitest'
import { formatNodeLabel, getRelatedPosts } from './graph-model'
import type { PostMeta, Relation } from './types'

const post = (id: number, title: string): PostMeta => ({
  id,
  title,
  publishedAt: '2026-09-22',
  summary: '',
  description: '',
  thumbnail: null,
  tags: [],
  category: '기본',
  keywords: [],
  fileName: `${id}.md`,
})

describe('formatNodeLabel', () => {
  it('balances multiword titles across two lines', () => {
    expect(formatNodeLabel('RootLog 시작')).toBe('RootLog\n시작')
    expect(formatNodeLabel('기술 블로그 운영 방법')).toBe('기술 블로그\n운영 방법')
  })

  it('leaves a single word unchanged', () => {
    expect(formatNodeLabel('RootLog')).toBe('RootLog')
  })
})

describe('getRelatedPosts', () => {
  const posts = [post(1, 'RootLog 시작'), post(2, '환경 구성'), post(3, '운영 방법')]

  it('shows both directions and orders connections by strength', () => {
    const relations: Relation[] = [
      { from: 1, to: 3, relation: 'reference', weight: 0.71 },
      { from: 2, to: 1, relation: 'topic', weight: 0.83 },
    ]

    expect(getRelatedPosts(posts, relations, 1).map(({ post, relation, weight }) => [post.id, relation, weight])).toEqual([
      [2, 'topic', 0.83],
      [3, 'reference', 0.71],
    ])
  })

  it('returns an empty list for an isolated post', () => {
    expect(getRelatedPosts(posts, [], 1)).toEqual([])
  })
})
