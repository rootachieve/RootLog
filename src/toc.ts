import GithubSlugger from 'github-slugger'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

export type TocHeading = { id: string; level: number; text: string }

function plainText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const value = node as Record<string, unknown>
  if (typeof value.value === 'string') return value.value
  if (typeof value.alt === 'string') return value.alt
  return Array.isArray(value.children) ? value.children.map(plainText).join('') : ''
}

export function extractToc(markdown: string): TocHeading[] {
  const tree = unified().use(remarkParse).parse(markdown)
  const slugger = new GithubSlugger()
  return tree.children.flatMap((node) => {
    if (node.type !== 'heading' || node.depth > 3) return []
    const text = plainText(node).trim()
    return text ? [{ id: slugger.slug(text), level: node.depth, text }] : []
  })
}
