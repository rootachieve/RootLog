import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { getPost, getPostMarkdown, posts, relations } from './content'
import { getRelatedPosts, relationColorToken } from './graph-model'
import { formatCount, useStats } from './stats'
import { extractToc, type TocHeading } from './toc'

function useActiveHeading(headings: TocHeading[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null)
  useEffect(() => {
    if (!headings.length) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        let current = headings[0].id
        for (const heading of headings) {
          const element = document.getElementById(heading.id)
          if (element && element.getBoundingClientRect().top <= 120) current = heading.id
        }
        if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
          current = headings[headings.length - 1].id
        }
        setActiveId(current)
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [headings])
  return activeId
}

function TocItems({ headings, activeId, onNavigate }: { headings: TocHeading[]; activeId: string | null; onNavigate?: () => void }) {
  const listRef = useRef<HTMLOListElement>(null)
  useEffect(() => {
    const list = listRef.current
    const active = list?.querySelector<HTMLElement>('[aria-current="location"]')
    if (!list || !active) return
    const listBox = list.getBoundingClientRect()
    const activeBox = active.getBoundingClientRect()
    if (activeBox.top < listBox.top || activeBox.bottom > listBox.bottom) {
      list.scrollTo({ top: list.scrollTop + activeBox.top - listBox.top - 12, behavior: 'smooth' })
    }
  }, [activeId])

  return (
    <ol className="toc-list" ref={listRef}>
      {headings.map((heading) => (
        <li key={heading.id}>
          <button
            type="button"
            className={`toc-link toc-level-${heading.level}`}
            aria-current={activeId === heading.id ? 'location' : undefined}
            onClick={() => {
              const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
              document.getElementById(heading.id)?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' })
              onNavigate?.()
            }}
          >{heading.text}</button>
        </li>
      ))}
    </ol>
  )
}

export default function PostPage({ id }: { id: number }) {
  const post = getPost(id)
  const relatedPosts = getRelatedPosts(posts, relations, id)
  const stats = useStats()
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const mobileTocRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (!post) return
    let mounted = true
    setMarkdown(null)
    setLoadError(false)
    getPostMarkdown(post)
      .then((body) => { if (mounted) { setMarkdown(body); setLoadError(false) } })
      .catch(() => { if (mounted) setLoadError(true) })
    return () => { mounted = false }
  }, [post])

  const headings = useMemo(() => markdown === null ? [] : extractToc(markdown), [markdown])
  const activeId = useActiveHeading(headings)
  const renderedMarkdown = useMemo(() => markdown === null ? null : (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug, rehypeHighlight]}>{markdown}</ReactMarkdown>
  ), [markdown])

  if (!post) {
    return <main className="site-container empty-message"><h1>글을 찾을 수 없습니다.</h1><Link className="back-link" to="/" search={{}}>글 목록으로 돌아가기</Link></main>
  }

  return (
    <main className="site-container detail-grid">
      <article className="article-column">
        <Link className="back-link" to="/" search={{}}>← 글 목록</Link>
        <h1 className="article-title">{post.title}</h1>
        <div className="article-meta">
          {post.publishedAt.replaceAll('-', '.')} · <Link to="/" search={{ category: post.category }}>{post.category}</Link> · 조회 {formatCount(stats?.postViews[String(post.id)])}
        </div>
        <div className="article-tags">{post.tags.map((tag) => <span className="tag-pill" key={tag}>{tag}</span>)}</div>
        <section className="article-summary" aria-labelledby="summary-heading">
          <h2 id="summary-heading">요약</h2>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.summary}</ReactMarkdown>
        </section>
        {headings.length > 0 && (
          <details className="mobile-toc" ref={mobileTocRef}>
            <summary>목차</summary>
            <TocItems headings={headings} activeId={activeId} onNavigate={() => mobileTocRef.current?.removeAttribute('open')} />
          </details>
        )}
        {post.thumbnail && <img className="article-hero" src={post.thumbnail} alt="" />}
        {loadError ? <p className="empty-message">글을 불러오지 못했습니다. 새로고침해 다시 시도해 주세요.</p> : markdown === null ? <p className="empty-message">글을 불러오는 중입니다.</p> : (
          <div className="article-body">{renderedMarkdown}</div>
        )}
        <section className="article-related" aria-labelledby="related-heading">
          <h2 id="related-heading">연결된 글 <span>{relatedPosts.length}</span></h2>
          {relatedPosts.length ? (
            <ul>
              {relatedPosts.map(({ post: relatedPost, relation, weight }) => (
                <li key={`${relatedPost.id}-${relation}`}>
                  <Link to="/posts/$postId/" params={{ postId: String(relatedPost.id) }}>
                    <span className="article-related-title">{relatedPost.title}</span>
                    <span className="article-related-kind"><span style={{ backgroundColor: `var(${relationColorToken(relation)})` }} aria-hidden="true" />{relation}</span>
                    <span className="article-related-strength">연결 강도 <strong>{weight.toFixed(2)}</strong></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="article-related-empty">아직 연결된 글이 없습니다.</p>}
        </section>
      </article>
      <aside className="toc-column" aria-label="이 글의 목차">
        {headings.length > 0 && <div className="toc-sticky"><h2 className="toc-title">목차</h2><TocItems headings={headings} activeId={activeId} /></div>}
      </aside>
    </main>
  )
}
