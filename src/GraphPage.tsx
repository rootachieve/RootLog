import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import { formatNodeLabel, getRelatedPosts } from './graph-model'
import type { PostMeta, Relation } from './types'
import './graph.css'

type GraphPageProps = { posts: PostMeta[]; relations: Relation[] }

const relationPatterns: Record<string, 'topic' | 'reference' | 'series'> = {
  선행지식: 'topic',
  적용: 'topic',
  확장: 'series',
  검증: 'reference',
  보완: 'reference',
  반박: 'series',
  topic: 'topic',
  reference: 'reference',
  series: 'series',
}
const relationLabels: Record<string, string> = {
  topic: '주제 연관',
  reference: '참고 언급',
  series: '연속 주제',
}

const relationLabel = (value: string) => relationLabels[value] ?? value
const relationClass = (value: string) => relationPatterns[value] ?? 'topic'

export default function GraphPage({ posts, relations }: GraphPageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<cytoscape.Core | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(posts[0]?.id ?? null)
  const [showLabels, setShowLabels] = useState(true)
  const activeId = posts.some((post) => post.id === selectedId) ? selectedId : (posts[0]?.id ?? null)
  const selectedPost = posts.find((post) => post.id === activeId)
  const relatedPosts = activeId === null ? [] : getRelatedPosts(posts, relations, activeId)
  const legend = [...new Set(relations.map((relation) => relation.relation))]

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const css = getComputedStyle(container)
    const token = (name: string) => css.getPropertyValue(name).trim()
    const graph = cytoscape({
      container,
      elements: [
        ...posts.map((post) => ({ data: { id: String(post.id), title: formatNodeLabel(post.title) } })),
        ...relations.map((relation, index) => ({
          data: {
            id: `relation-${index}`,
            source: String(relation.from),
            target: String(relation.to),
          },
          classes: relationClass(relation.relation),
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': token('--semantic-graph-node'),
            'border-color': token('--semantic-text'),
            'border-width': 1.3,
            color: token('--semantic-text'),
            label: 'data(title)',
            width: 116,
            height: 116,
            'font-family': css.fontFamily,
            'font-size': 15,
            'font-weight': 500,
            'text-wrap': 'wrap',
            'text-overflow-wrap': 'anywhere',
            'text-max-width': '88px',
            'text-halign': 'center',
            'text-valign': 'center',
            'text-justification': 'center',
            'overlay-opacity': 0,
          },
        },
        {
          selector: 'node.is-selected',
          style: {
            'background-color': token('--semantic-selected'),
            'border-color': token('--semantic-selected'),
            color: token('--semantic-page'),
            'font-weight': 600,
          },
        },
        {
          selector: 'node.is-dimmed',
          style: { 'border-color': token('--semantic-graph-dim'), color: token('--semantic-graph-dim') },
        },
        { selector: 'node.labels-hidden', style: { label: '' } },
        {
          selector: 'edge',
          style: {
            width: 1.4,
            'line-color': token('--semantic-graph-edge'),
            'curve-style': 'straight',
            'line-style': 'solid',
            'overlay-opacity': 0,
          },
        },
        { selector: 'edge.reference', style: { 'line-style': 'dotted' } },
        { selector: 'edge.series', style: { 'line-style': 'dashed' } },
        { selector: 'edge.is-dimmed', style: { 'line-color': token('--semantic-graph-dim') } },
      ],
      layout: {
        name: 'cose',
        animate: false,
        fit: true,
        padding: 72,
        nodeRepulsion: () => 500000,
        idealEdgeLength: () => 210,
      },
      minZoom: 0.35,
      maxZoom: 1.6,
    })

    graphRef.current = graph
    if (posts.length === 1 && graph.zoom() > 1) {
      graph.zoom(1)
      graph.center()
    }
    graph.on('tap', 'node', (event) => setSelectedId(Number(event.target.id())))
    graph.on('mouseover', 'node', () => { container.style.cursor = 'pointer' })
    graph.on('mouseout', 'node', () => { container.style.cursor = 'grab' })
    const observer = new ResizeObserver(() => graph.resize())
    observer.observe(container)

    return () => {
      observer.disconnect()
      graph.destroy()
      graphRef.current = null
    }
  }, [posts, relations])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    graph.nodes().removeClass('is-selected')
    if (activeId !== null) graph.getElementById(String(activeId)).addClass('is-selected')
    const connected = new Set(relations.flatMap(({ from, to }) =>
      from === activeId ? [String(to)] : to === activeId ? [String(from)] : [],
    ))
    graph.nodes().forEach((node) => {
      node.toggleClass('is-dimmed', node.id() !== String(activeId) && !connected.has(node.id()))
    })
    graph.edges().forEach((edge) => {
      edge.toggleClass(
        'is-dimmed',
        edge.data('source') !== String(activeId) && edge.data('target') !== String(activeId),
      )
    })
  }, [activeId, posts, relations])

  useEffect(() => {
    graphRef.current?.nodes().toggleClass('labels-hidden', !showLabels)
  }, [showLabels, posts, relations])

  function zoom(factor: number) {
    const graph = graphRef.current
    if (!graph) return
    graph.zoom({
      level: Math.max(graph.minZoom(), Math.min(graph.maxZoom(), graph.zoom() * factor)),
      renderedPosition: { x: graph.width() / 2, y: graph.height() / 2 },
    })
  }

  function selectWithKeyboard(key: string) {
    if (!posts.length || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return
    const direction = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1
    const current = posts.findIndex((post) => post.id === activeId)
    setSelectedId(posts[(current + direction + posts.length) % posts.length].id)
  }

  return (
    <main className="graph-page">
      <h1>관계 그래프</h1>
      <div className="graph-layout">
        <section className="graph-main" aria-label="글 관계 그래프">
          <p className="graph-intro">글 사이의 연결을 살펴보세요.</p>
          {legend.length > 0 && (
            <div className="graph-legend" aria-label="관계 유형">
              {legend.map((value) => (
                <span className="graph-legend-item" key={value}>
                  <span className={`graph-line graph-line-${relationClass(value)}`} aria-hidden="true" />
                  {relationLabel(value)}
                </span>
              ))}
            </div>
          )}
          <div className="graph-stage">
            <div
              className="graph-canvas"
              ref={containerRef}
              role="group"
              tabIndex={0}
              aria-label="글 관계 그래프. 방향키로 글을 선택하고, 마우스로 드래그하거나 확대할 수 있습니다."
              onKeyDown={(event) => {
                if (event.key.startsWith('Arrow')) {
                  event.preventDefault()
                  selectWithKeyboard(event.key)
                }
              }}
            />
            {posts.length === 0 && <p className="graph-empty">표시할 글이 없습니다.</p>}
            <div className="graph-controls">
              <button type="button" aria-label="축소" onClick={() => zoom(1 / 1.2)}>−</button>
              <button type="button" aria-label="확대" onClick={() => zoom(1.2)}>+</button>
              <span className="graph-controls-divider" aria-hidden="true" />
              <button
                type="button"
                className="graph-label-toggle"
                aria-label="제목 표시"
                aria-pressed={showLabels}
                onClick={() => setShowLabels((value) => !value)}
              >
                <span className="graph-switch" aria-hidden="true"><span /></span>
                제목 표시
              </button>
            </div>
          </div>
        </section>

        <aside className="graph-sidebar" aria-live="polite">
          <p className="graph-sidebar-eyebrow">선택한 글</p>
          {selectedPost ? (
            <>
              <h2>{selectedPost.title}</h2>
              <dl className="graph-post-meta">
                <div><dt>카테고리</dt><dd>{selectedPost.category}</dd></div>
                <div><dt>태그</dt><dd>{selectedPost.tags.length ? selectedPost.tags.join(' · ') : '—'}</dd></div>
              </dl>
              {selectedPost.description && <p className="graph-post-description">{selectedPost.description}</p>}
              <a className="graph-read-link" href={`/posts/${selectedPost.id}/`}>글 읽기 ↗</a>

              <section className="graph-related" aria-label="연결된 글">
                <h3>연결된 글 <span>{relatedPosts.length}</span></h3>
                {relatedPosts.length ? (
                  <ul>
                    {relatedPosts.map(({ post, relation, weight }) => (
                      <li key={`${post.id}-${relation}`}>
                        <a href={`/posts/${post.id}/`}>
                          <span className="graph-related-title">{post.title}</span>
                          <span className="graph-related-kind">{relationLabel(relation)}</span>
                          <span className="graph-related-score"><span>유사도</span>{weight.toFixed(2)}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="graph-related-empty">아직 연결된 글이 없습니다.</p>
                )}
              </section>
            </>
          ) : (
            <p className="graph-related-empty">글을 선택해 자세히 살펴보세요.</p>
          )}
        </aside>
      </div>
    </main>
  )
}
