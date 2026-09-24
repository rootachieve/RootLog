import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterContextProvider } from '@tanstack/react-router'
import { describe, expect, it, vi } from 'vitest'
import PostPage from './PostPage'

vi.mock('./content', () => {
  const posts = [
    { id: 1, title: '현재 글', publishedAt: '2026-09-24', summary: '', description: '', thumbnail: null, tags: [], category: '기본', keywords: [], fileName: '1.md' },
    { id: 2, title: '먼저 읽을 글', publishedAt: '2026-09-23', summary: '', description: '', thumbnail: null, tags: [], category: '기본', keywords: [], fileName: '2.md' },
    { id: 3, title: '다음에 읽을 글', publishedAt: '2026-09-22', summary: '', description: '', thumbnail: null, tags: [], category: '기본', keywords: [], fileName: '3.md' },
    { id: 4, title: '연결 없는 글', publishedAt: '2026-09-21', summary: '', description: '', thumbnail: null, tags: [], category: '기본', keywords: [], fileName: '4.md' },
  ]
  return {
    getPost: (id: number) => posts.find((post) => post.id === id),
    getPostMarkdown: () => Promise.resolve('본문'),
    posts,
    relations: [
      { from: 1, to: 2, relation: '선행지식', weight: 0.64 },
      { from: 3, to: 1, relation: '확장', weight: 0.91 },
    ],
  }
})

async function renderPost(id: number) {
  const root = createRootRoute()
  const route = createRoute({ getParentRoute: () => root, path: '/posts/$postId', component: () => <PostPage id={id} /> })
  const router = createRouter({ routeTree: root.addChildren([route]), history: createMemoryHistory({ initialEntries: [`/posts/${id}/`] }), trailingSlash: 'always' })
  await router.load()
  return renderToStaticMarkup(<RouterContextProvider router={router}><PostPage id={id} /></RouterContextProvider>)
}

describe('post relations', () => {
  it('shows connected post links, relation types, and strengths below the post', async () => {
    const html = await renderPost(1)
    expect(html).toContain('연결된 글')
    expect(html).toMatch(/href="\/posts\/3\/"[^>]*>.*다음에 읽을 글/)
    expect(html).toContain('확장')
    expect(html).toContain('0.91')
    expect(html).toMatch(/href="\/posts\/2\/"[^>]*>.*먼저 읽을 글/)
    expect(html).toContain('선행지식')
    expect(html).toContain('0.64')
    expect(html.indexOf('연결된 글')).toBeGreaterThan(html.indexOf('글을 불러오는 중입니다'))
  })

  it('shows an empty state when the post has no connections', async () => {
    expect(await renderPost(4)).toContain('아직 연결된 글이 없습니다.')
  })
})
