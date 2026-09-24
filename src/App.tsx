import { Suspense, lazy, useEffect } from 'react'
import {
  Link, Outlet, RouterProvider, createRootRoute, createRoute, createRouter, useLocation,
} from '@tanstack/react-router'
import { trackPageView } from './analytics'
import { getPost, posts, relations } from './content'
import { formatCount, useStats, visitorDateLabel } from './stats'

const PostPage = lazy(() => import('./PostPage'))
const GraphPage = lazy(() => import('./GraphPage'))

function SiteHeader() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const graphActive = pathname.startsWith('/graph')
  return (
    <header className="site-header">
      <div className="site-container site-header-inner">
        <Link to="/" search={{}} className="site-logo" aria-label="RootLog 홈">RootLog</Link>
        <nav className="site-nav" aria-label="주 메뉴">
          <Link to="/" search={{}} aria-current={graphActive ? undefined : 'page'}>글</Link>
          <Link to="/graph/" aria-current={graphActive ? 'page' : undefined}>관계 그래프</Link>
        </nav>
      </div>
    </header>
  )
}

function SiteLayout() {
  const pathname = useLocation({ select: (location) => location.pathname })
  useEffect(() => {
    window.scrollTo(0, 0)
    const match = pathname.match(/^\/posts\/(\d+)\/?$/)
    const post = match ? getPost(Number(match[1])) : undefined
    const title = post ? `${post.title} | RootLog` : pathname.startsWith('/graph') ? '관계 그래프 | RootLog' : 'RootLog'
    document.title = title
    trackPageView(pathname, title)
  }, [pathname])

  return (
    <div className="min-h-screen flex flex-col bg-page text-content">
      <SiteHeader />
      <div className="flex-1"><Outlet /></div>
      <footer className="site-footer">
        <div className="site-container site-footer-inner"><span>RootLog</span><span>© {new Date().getFullYear()} RootLog</span></div>
      </footer>
    </div>
  )
}

function HomePage() {
  const { category } = homeRoute.useSearch()
  const stats = useStats()
  const categories = [...new Set(posts.map((post) => post.category))]
  const visiblePosts = category ? posts.filter((post) => post.category === category) : posts
  const counts = posts.reduce((result, post) => result.set(post.category, (result.get(post.category) ?? 0) + 1), new Map<string, number>())
  const hasStats = stats?.totalVisitors != null || stats?.yesterdayVisitors != null

  return (
    <main className="site-container">
      <div className="page-heading">
        <h1>{category || '최근 글'}</h1>
        <p className="visitor-line">
          {hasStats ? `누적 방문 ${formatCount(stats?.totalVisitors)} · ${visitorDateLabel(stats?.visitorDate ?? null)} ${formatCount(stats?.yesterdayVisitors)}` : '방문 통계 집계 준비 중'}
        </p>
      </div>
      <nav className="filters" aria-label="글 카테고리">
        <Link to="/" search={{}} className="filter-pill" aria-current={!category ? 'true' : undefined} aria-label={`전체, ${posts.length}개 글`}>전체</Link>
        {categories.map((name) => (
          <Link
            key={name}
            to="/"
            search={{ category: name }}
            className="filter-pill"
            aria-current={category === name ? 'true' : undefined}
            aria-label={`${name}, ${counts.get(name)}개 글`}
          >{name}</Link>
        ))}
      </nav>
      {visiblePosts.length ? (
        <div className="post-list">
          {visiblePosts.map((post, index) => (
            <Link className={`post-row${post.thumbnail ? '' : ' post-row-text-only'}`} to="/posts/$postId/" params={{ postId: String(post.id) }} key={post.id}>
              {post.thumbnail && <img className="post-row-image" src={post.thumbnail} alt="" loading={index === 0 ? 'eager' : 'lazy'} />}
              <div className="post-row-text">
                <h2 className="post-row-title">{post.title}</h2>
                <p className="post-row-meta">{post.publishedAt.replaceAll('-', '.')} · {post.category}</p>
                <p className="post-row-desc">{post.description}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : <p className="empty-message">{category ? '이 카테고리에는 아직 글이 없습니다.' : '아직 글이 없습니다.'}</p>}
    </main>
  )
}

function GraphScreen() {
  return <Suspense fallback={<div className="site-container empty-message">그래프를 불러오는 중입니다.</div>}><GraphPage posts={posts} relations={relations} /></Suspense>
}

function PostScreen() {
  const { postId } = postRoute.useParams()
  return <Suspense fallback={<div className="site-container empty-message">글을 불러오는 중입니다.</div>}><PostPage id={Number(postId)} /></Suspense>
}

function NotFound() {
  return <main className="site-container empty-message"><h1>페이지를 찾을 수 없습니다.</h1><Link className="back-link" to="/" search={{}}>글 목록으로 돌아가기</Link></main>
}

const rootRoute = createRootRoute({ component: SiteLayout, notFoundComponent: NotFound })
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search): { category?: string } => typeof search.category === 'string' && search.category.trim() ? { category: search.category } : {},
  component: HomePage,
})
const graphRoute = createRoute({ getParentRoute: () => rootRoute, path: 'graph', component: GraphScreen })
const postRoute = createRoute({ getParentRoute: () => rootRoute, path: 'posts/$postId', component: PostScreen })
const router = createRouter({ routeTree: rootRoute.addChildren([homeRoute, graphRoute, postRoute]), basepath: '/', trailingSlash: 'always' })

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

export default function App() { return <RouterProvider router={router} /> }
