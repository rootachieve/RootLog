import { describe, expect, it } from 'vitest'
import { categoryColorToken, formatNodeLabel, getRelatedPosts, linkDistance, linkStrength, nodeDiameter, relationColorToken, selectedEdgeWidths } from './graph-model'
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

  it('shortens a long node label while the panel retains the full title', () => {
    expect(formatNodeLabel('Markdown과 목차 검증 가이드')).toBe('Markdown과\n목차…')
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

describe('graph relation display', () => {
  const relations: Relation[] = [
    { from: 1, to: 2, relation: '선행지식', weight: 0.2 },
    { from: 3, to: 1, relation: '적용', weight: 0.5 },
    { from: 1, to: 4, relation: '확장', weight: 0.8 },
    { from: 2, to: 3, relation: '검증', weight: 0.9 },
  ]

  it('maps selected incident weights to line widths 1 through 3', () => {
    expect([...selectedEdgeWidths(relations, 1)]).toEqual([[0, 1], [1, 2], [2, 3]])
    expect([...selectedEdgeWidths([{ ...relations[0], weight: 0.5 }], 1)]).toEqual([[0, 2]])
  })

  it('assigns every known relation a semantic pastel token', () => {
    expect(['선행지식', '적용', '확장', '검증', '보완', '반박'].map(relationColorToken)).toEqual([
      '--semantic-relation-prerequisite',
      '--semantic-relation-application',
      '--semantic-relation-extension',
      '--semantic-relation-verification',
      '--semantic-relation-complement',
      '--semantic-relation-contradiction',
    ])
    expect(relationColorToken('알 수 없음')).toBe('--semantic-graph-edge')
  })

  it('pulls stronger connections closer with greater spring strength', () => {
    expect(linkDistance(0.8)).toBeLessThan(linkDistance(0.2))
    expect(linkStrength(0.8)).toBeGreaterThan(linkStrength(0.2))
  })

  it('starts links at distance 40 and keeps strong links from collapsing', () => {
    expect(linkDistance(0)).toBe(40)
    expect(linkDistance(0.2)).toBe(26)
    expect(linkDistance(1)).toBe(16)
  })

  it('keeps links longer than the collision space of their nodes', () => {
    expect(linkDistance(0.8, 20, 18)).toBe(42)
  })
})

it('makes highly connected nodes visibly larger', () => {
  expect(nodeDiameter(0)).toBe(8)
  expect(nodeDiameter(5)).toBe(17)
  expect(nodeDiameter(20)).toBeCloseTo(22.4)
})

it('gives each post category its own semantic pastel node color', () => {
  expect(['기본', '프론트엔드', '백엔드', '데이터', '인프라', '개발 방법', '독서'].map(categoryColorToken)).toEqual([
    '--semantic-category-default',
    '--semantic-category-frontend',
    '--semantic-category-backend',
    '--semantic-category-data',
    '--semantic-category-infrastructure',
    '--semantic-category-practice',
    '--semantic-category-reading',
  ])
  expect(categoryColorToken('새 카테고리')).toBe('--semantic-category-default')
})
