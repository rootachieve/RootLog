import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import {
  forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY,
  type SimulationLinkDatum, type SimulationNodeDatum,
} from 'd3-force'
import {
  categoryColorToken, formatNodeLabel, getRelatedPosts, linkDistance, linkStrength, nodeDiameter,
  relationColorToken, selectedEdgeWidths,
} from './graph-model'
import type { PostMeta, Relation } from './types'
import './graph.css'

type GraphPageProps = { posts: PostMeta[]; relations: Relation[] }
type ForceNode = SimulationNodeDatum & {
  id: string; radius: number; groupX: number; groupRadius: number
}
type ForceEdge = SimulationLinkDatum<ForceNode> & { weight: number }

export default function GraphPage({ posts, relations }: GraphPageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<cytoscape.Core | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [panelPostId, setPanelPostId] = useState<number | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const activeId = selectedId !== null && posts.some((post) => post.id === selectedId) ? selectedId : null
  const previousActiveRef = useRef<number | null>(null)
  const selectedPost = posts.find((post) => post.id === activeId)
  const displayedId = activeId ?? panelPostId
  const displayedPost = posts.find((post) => post.id === displayedId)
  const relatedPosts = displayedId === null ? [] : getRelatedPosts(posts, relations, displayedId)
  const legend = activeId === null ? [] : [
    ...new Set(relations.filter(({ from, to }) => from === activeId || to === activeId).map(({ relation }) => relation)),
  ]

  function selectNode(id: number) {
    setPanelPostId(id)
    setSelectedId(id)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const css = getComputedStyle(container)
    const token = (name: string) => css.getPropertyValue(name).trim()
    const degrees = new Map(posts.map((post) => [post.id, 0]))
    for (const { from, to } of relations) {
      degrees.set(from, (degrees.get(from) ?? 0) + 1)
      degrees.set(to, (degrees.get(to) ?? 0) + 1)
    }
    const diameter = (id: number) => nodeDiameter(degrees.get(id) ?? 0)
    const graph = cytoscape({
      container,
      elements: [
        ...posts.map((post) => ({
          data: {
            id: String(post.id),
            title: formatNodeLabel(post.title),
            color: token(categoryColorToken(post.category)),
            diameter: diameter(post.id),
          },
        })),
        ...relations.map((relation, index) => ({
          data: {
            id: `relation-${index}`,
            source: String(relation.from),
            target: String(relation.to),
            color: token(relationColorToken(relation.relation)),
            activeWidth: 1.2,
          },
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            shape: 'ellipse',
            'background-color': 'data(color)',
            'border-color': token('--semantic-text'),
            'border-width': 0.8,
            'border-opacity': 0.22,
            width: 'data(diameter)',
            height: 'data(diameter)',
            label: 'data(title)',
            color: token('--semantic-text'),
            'font-family': css.fontFamily,
            'font-size': 11,
            'font-weight': 500,
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            'text-halign': 'center',
            'text-valign': 'bottom',
            'text-margin-y': 8,
            'text-opacity': 0.55,
            'overlay-opacity': 0,
          },
        },
        { selector: 'node.is-zoomed-out', style: { 'text-opacity': 0 } },
        {
          selector: 'node.is-selected',
          style: { width: 22, height: 22, 'border-width': 2, 'border-opacity': 1, 'font-weight': 600, 'text-opacity': 1 },
        },
        { selector: 'node.is-muted', style: { opacity: 0.12 } },
        { selector: 'node.is-hovered', style: { opacity: 1, 'text-opacity': 1 } },
        { selector: 'node.labels-hidden', style: { label: '' } },
        {
          selector: 'edge',
          style: {
            width: 0.75,
            'line-color': token('--semantic-text'),
            opacity: 0.34,
            'curve-style': 'straight',
            'overlay-opacity': 0,
          },
        },
        { selector: 'edge.is-active', style: { width: 'data(activeWidth)', 'line-color': 'data(color)', opacity: 1 } },
        { selector: 'edge.is-muted', style: { opacity: 0.06 } },
      ],
      layout: { name: 'preset' },
      boxSelectionEnabled: false,
      minZoom: 0.08,
      maxZoom: 3,
    })

    graphRef.current = graph
    const components = graph.elements().components()
      .map((component) => component.nodes().map((node) => node.id()))
      .sort((a, b) => b.length - a.length)
    const gap = 160
    const radii = components.map((ids) => Math.max(90, Math.sqrt(ids.length) * 27.5))
    let left = -(radii.reduce((sum, radius) => sum + radius * 2, 0) + gap * Math.max(0, radii.length - 1)) / 2
    const groups = new Map<string, { x: number; radius: number }>()
    components.forEach((ids, index) => {
      const radius = radii[index]
      for (const id of ids) groups.set(id, { x: left + radius, radius })
      left += radius * 2 + gap
    })
    const forceNodes: ForceNode[] = posts.map((post) => ({
      id: String(post.id),
      radius: diameter(post.id) / 2 + 9,
      groupX: groups.get(String(post.id))?.x ?? 0,
      groupRadius: groups.get(String(post.id))?.radius ?? 90,
    }))
    const forceEdges: ForceEdge[] = relations.map(({ from, to, weight }) => ({
      source: String(from), target: String(to), weight,
    }))
    const byId = new Map(forceNodes.map((node) => [node.id, node]))
    const idleAlpha = 0.22
    const simulation = forceSimulation(forceNodes)
      .force('link', forceLink<ForceNode, ForceEdge>(forceEdges)
        .id((node) => node.id)
        .distance((edge) => linkDistance(edge.weight, (edge.source as ForceNode).radius, (edge.target as ForceNode).radius))
        .strength((edge) => linkStrength(edge.weight)))
      .force('charge', forceManyBody<ForceNode>().strength(-170).distanceMax(420))
      .force('collide', forceCollide<ForceNode>((node) => node.radius).strength(0.9))
      .force('x', forceX<ForceNode>((node) => node.groupX).strength(0.15))
      .force('y', forceY<ForceNode>(0).strength((node) => node.groupRadius <= 100 ? 0.25 : 0.15))
      .force('circle', (alpha) => {
        for (const node of forceNodes) {
          const x = (node.x ?? 0) - node.groupX
          const y = node.y ?? 0
          const radius = Math.hypot(x, y)
          if (radius <= node.groupRadius) continue
          const pull = (radius - node.groupRadius) / radius * 0.25 * alpha
          node.vx = (node.vx ?? 0) - x * pull
          node.vy = (node.vy ?? 0) - y * pull
        }
      })
      .velocityDecay(0.35)
      .alphaTarget(idleAlpha)
      .stop()

    const syncPositions = () => graph.batch(() => {
      for (const node of forceNodes) {
        const element = graph.getElementById(node.id)
        if (!element.grabbed()) element.position({ x: node.x ?? 0, y: node.y ?? 0 })
      }
    })
    simulation.tick(1000)
    syncPositions()
    if (posts.length) {
      graph.fit(graph.nodes(), 36)
      if (posts.length === 1 && graph.zoom() > 1.2) {
        graph.zoom(1.2)
        graph.center(graph.nodes())
      }
    }

    const updateLabelFade = () => graph.nodes().toggleClass('is-zoomed-out', graph.zoom() < 1.5)
    updateLabelFade()
    graph.on('zoom', updateLabelFade)
    let frame = 0
    simulation.on('tick', () => {
      if (frame) return
      frame = requestAnimationFrame(() => { frame = 0; syncPositions() })
    })
    if (forceNodes.length > 1) simulation.restart()
    let dragging = false
    graph.on('grab', 'node', (event) => {
      const node = byId.get(event.target.id())
      if (!node) return
      dragging = false
      node.x = node.fx = event.target.position('x')
      node.y = node.fy = event.target.position('y')
    })
    graph.on('drag', 'node', (event) => {
      const node = byId.get(event.target.id())
      if (!node) return
      node.x = node.fx = event.target.position('x')
      node.y = node.fy = event.target.position('y')
      if (!dragging) {
        dragging = true
        simulation.alpha(0.35).alphaTarget(idleAlpha).restart()
      }
    })
    graph.on('free', 'node', (event) => {
      const node = byId.get(event.target.id())
      if (!node) return
      node.x = event.target.position('x')
      node.y = event.target.position('y')
      node.fx = null
      node.fy = null
      if (dragging) simulation.alphaTarget(idleAlpha)
      dragging = false
    })
    graph.on('tap', 'node', (event) => selectNode(Number(event.target.id())))
    graph.on('tap', (event) => { if (event.target === graph) setSelectedId(null) })
    graph.on('mouseover', 'node', (event) => {
      event.target.addClass('is-hovered')
      container.style.cursor = 'pointer'
    })
    graph.on('mouseout', 'node', (event) => {
      event.target.removeClass('is-hovered')
      container.style.cursor = 'grab'
    })
    const observer = new ResizeObserver(() => graph.resize())
    observer.observe(container)

    return () => {
      cancelAnimationFrame(frame)
      simulation.stop()
      observer.disconnect()
      graph.destroy()
      graphRef.current = null
    }
  }, [posts, relations])

  useLayoutEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    const widths = activeId === null ? new Map<number, number>() : selectedEdgeWidths(relations, activeId)
    const connected = new Set(relations.flatMap(({ from, to }) =>
      from === activeId ? [String(to)] : to === activeId ? [String(from)] : [],
    ))
    graph.batch(() => {
      graph.nodes().forEach((node) => {
        node.toggleClass('is-selected', node.id() === String(activeId))
        node.toggleClass('is-muted', activeId !== null && node.id() !== String(activeId) && !connected.has(node.id()))
      })
      graph.edges().forEach((edge, index) => {
        const active = widths.has(index)
        edge.toggleClass('is-active', active)
        edge.toggleClass('is-muted', activeId !== null && !active)
        if (active) edge.data('activeWidth', widths.get(index))
      })
    })
    const previous = previousActiveRef.current
    previousActiveRef.current = activeId
    let cameraFrame = 0
    const startFrame = requestAnimationFrame(() => {
      if (!graph.nodes().length) return
      if (activeId === null && previous === null) {
        graph.fit(graph.nodes(), 36)
        return
      }
      const startZoom = graph.zoom()
      const startPan = graph.pan()
      const selectedNode = activeId === null ? null : graph.getElementById(String(activeId))
      const startNodePosition = selectedNode?.renderedPosition()
      const sidebar = containerRef.current?.closest('.graph-layout')?.querySelector<HTMLElement>('.graph-sidebar')
      const desktop = window.matchMedia('(min-width: 821px)').matches
      const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 360
      const startedAt = performance.now()
      const moveCamera = (now: number) => {
        const progress = duration === 0 ? 1 : Math.min(1, (now - startedAt) / duration)
        const eased = 1 - (1 - progress) ** 3
        let zoom: number
        let pan: { x: number; y: number }
        if (selectedNode && startNodePosition) {
          const targetZoom = Math.min(graph.maxZoom(), Math.max(startZoom, 1.2))
          zoom = startZoom + (targetZoom - startZoom) * eased
          const panelLeft = desktop && sidebar && containerRef.current
            ? sidebar.getBoundingClientRect().left - containerRef.current.getBoundingClientRect().left
            : graph.width()
          const visibleCenterX = Math.max(0, Math.min(graph.width(), panelLeft)) / 2
          pan = {
            x: startNodePosition.x + (visibleCenterX - startNodePosition.x) * eased - selectedNode.position('x') * zoom,
            y: startNodePosition.y + (graph.height() / 2 - startNodePosition.y) * eased - selectedNode.position('y') * zoom,
          }
        } else {
          const bounds = graph.nodes().boundingBox()
          const targetZoom = Math.max(graph.minZoom(), Math.min(
            graph.maxZoom(),
            Math.max(1, graph.width() - 72) / Math.max(1, bounds.w),
            Math.max(1, graph.height() - 72) / Math.max(1, bounds.h),
          ))
          const targetPan = {
            x: graph.width() / 2 - (bounds.x1 + bounds.x2) / 2 * targetZoom,
            y: graph.height() / 2 - (bounds.y1 + bounds.y2) / 2 * targetZoom,
          }
          zoom = startZoom + (targetZoom - startZoom) * eased
          pan = {
            x: startPan.x + (targetPan.x - startPan.x) * eased,
            y: startPan.y + (targetPan.y - startPan.y) * eased,
          }
        }
        graph.viewport({ zoom, pan })
        if (progress < 1) cameraFrame = requestAnimationFrame(moveCamera)
        else if (activeId === null) graph.fit(graph.nodes(), 36)
      }
      cameraFrame = requestAnimationFrame(moveCamera)
    })
    return () => {
      cancelAnimationFrame(startFrame)
      cancelAnimationFrame(cameraFrame)
    }
  }, [activeId, relations])

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
    selectNode(posts[(current + direction + posts.length) % posts.length].id)
  }

  return (
    <main className="graph-page">
      <h1>관계 그래프</h1>
      <p className="graph-intro">글 사이의 연결을 살펴보세요.</p>
      <div className={`graph-layout${selectedPost ? ' has-selection' : ''}`}>
        <section className="graph-main" aria-label="글 관계 그래프">
          <div className="graph-legend" aria-label="관계 유형" aria-hidden={legend.length === 0}>
            {legend.map((relation) => (
              <span className="graph-legend-item" key={relation}>
                <span className="graph-line" style={{ borderColor: `var(${relationColorToken(relation)})` }} aria-hidden="true" />
                {relation}
              </span>
            ))}
          </div>
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

        <aside className="graph-sidebar" aria-live="polite" aria-hidden={!selectedPost} inert={!selectedPost}>
          {displayedPost && (
            <>
            <div className="graph-sidebar-head">
              <p className="graph-sidebar-eyebrow">선택한 글</p>
              <button type="button" className="graph-close" onClick={() => setSelectedId(null)}>닫기</button>
            </div>
            <h2>{displayedPost.title}</h2>
            <dl className="graph-post-meta">
              <div><dt>카테고리</dt><dd>{displayedPost.category}</dd></div>
              <div><dt>태그</dt><dd>{displayedPost.tags.length ? displayedPost.tags.join(' · ') : '—'}</dd></div>
            </dl>
            {displayedPost.description && <p className="graph-post-description">{displayedPost.description}</p>}
            <a className="graph-read-link" href={`/posts/${displayedPost.id}/`}>글 읽기 ↗</a>

            <section className="graph-related" aria-label="연결된 글">
              <h3>연결된 글 <span>{relatedPosts.length}</span></h3>
              {relatedPosts.length ? (
                <ul>
                  {relatedPosts.map(({ post, relation, weight }) => (
                    <li key={`${post.id}-${relation}`}>
                      <button type="button" onClick={() => selectNode(post.id)}>
                        <span className="graph-related-title">{post.title}</span>
                        <span className="graph-related-kind">{relation}</span>
                        <span className="graph-related-score"><span>유사도</span>{weight.toFixed(2)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="graph-related-empty">아직 연결된 글이 없습니다.</p>
              )}
            </section>
            </>
          )}
        </aside>
      </div>
    </main>
  )
}
