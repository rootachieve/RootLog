import GithubSlugger from 'github-slugger'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

export type TocHeading = { id: string; level: number; text: string }

function plainText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const value = node as Record<string, unknown>
  if (typeof value.value === 'string') return value.value
  return Array.isArray(value.children) ? value.children.map(plainText).join('') : ''
}

export function extractToc(markdown: string): TocHeading[] {
  const tree = unified().use(remarkParse).parse(markdown)
  const slugger = new GithubSlugger()
  return tree.children.flatMap((node) => {
    if (node.type !== 'heading') return []
    const rawText = plainText(node)
    const id = slugger.slug(rawText)
    const text = rawText.trim()
    return node.depth <= 3 && text ? [{ id, level: node.depth, text }] : []
  })
}
