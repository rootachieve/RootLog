import type { PostMeta, Relation } from './types'

const categoryTokens: Record<string, string> = {
  기본: '--semantic-category-default',
  프론트엔드: '--semantic-category-frontend',
  백엔드: '--semantic-category-backend',
  데이터: '--semantic-category-data',
  인프라: '--semantic-category-infrastructure',
  '개발 방법': '--semantic-category-practice',
  독서: '--semantic-category-reading',
}

export function categoryColorToken(category: string): string {
  return categoryTokens[category] ?? '--semantic-category-default'
}

const relationTokens: Record<string, string> = {
  선행지식: '--semantic-relation-prerequisite',
  적용: '--semantic-relation-application',
  확장: '--semantic-relation-extension',
  검증: '--semantic-relation-verification',
  보완: '--semantic-relation-complement',
  반박: '--semantic-relation-contradiction',
}

export function relationColorToken(relation: string): string {
  return relationTokens[relation] ?? '--semantic-graph-edge'
}

export function selectedEdgeWidths(relations: Relation[], selectedId: number): Map<number, number> {
  const incident = relations.flatMap((relation, index) =>
    relation.from === selectedId || relation.to === selectedId ? [{ index, weight: relation.weight }] : [],
  )
  if (!incident.length) return new Map()
  const weights = incident.map(({ weight }) => weight)
  const min = Math.min(...weights)
  const range = Math.max(...weights) - min
  return new Map(incident.map(({ index, weight }) => [
    index,
    range === 0 ? 2 : Math.round((1 + 2 * (weight - min) / range) * 100) / 100,
  ]))
}

export function linkDistance(weight: number, sourceRadius = 0, targetRadius = 0): number {
  return Math.max(16, 40 - 70 * Math.max(0, Math.min(1, weight)), sourceRadius + targetRadius + 4)
}

export function linkStrength(weight: number): number {
  return 0.12 + 0.4 * Math.max(0, Math.min(1, weight))
}

export function nodeDiameter(degree: number): number {
  return 8 + Math.max(0, Math.min(degree, 8)) * 1.8
}

export function formatNodeLabel(title: string) {
  const trimmed = title.trim()
  const compact = trimmed.length > 14 ? `${trimmed.slice(0, 13).trimEnd()}…` : trimmed
  const words = compact.split(/\s+/)
  if (words.length < 2) return compact

  let split = 1
  let difference = Infinity
  for (let index = 1; index < words.length; index++) {
    const nextDifference = Math.abs(
      words.slice(0, index).join(' ').length - words.slice(index).join(' ').length,
    )
    if (nextDifference < difference) {
      difference = nextDifference
      split = index
    }
  }
  return `${words.slice(0, split).join(' ')}\n${words.slice(split).join(' ')}`
}

export function getRelatedPosts(posts: PostMeta[], relations: Relation[], selectedId: number) {
  const byId = new Map(posts.map((post) => [post.id, post]))

  return relations
    .filter(({ from, to }) => from === selectedId || to === selectedId)
    .map(({ from, to, relation, weight }) => ({
      post: byId.get(from === selectedId ? to : from),
      relation,
      weight,
    }))
    .filter((item): item is { post: PostMeta; relation: string; weight: number } => item.post !== undefined)
    .sort((a, b) => b.weight - a.weight || a.relation.localeCompare(b.relation, 'ko'))
}
