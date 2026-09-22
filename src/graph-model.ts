import type { PostMeta, Relation } from './types'

export function formatNodeLabel(title: string) {
  const words = title.trim().split(/\s+/)
  if (words.length < 2) return title

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
