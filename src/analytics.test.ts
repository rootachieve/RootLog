import { expect, it } from 'vitest'
import { createGtag, createPageViewTracker } from './analytics'

it('sends one view per route entry but counts a return visit', () => {
  const paths: string[] = []
  const track = createPageViewTracker((path) => paths.push(path))
  track('/posts/1/')
  track('/posts/1/')
  track('/graph/')
  track('/posts/1/')
  expect(paths).toEqual(['/posts/1/', '/graph/', '/posts/1/'])
})

it('queues gtag commands as the documented Arguments object', () => {
  const dataLayer: unknown[] = []
  const gtag = createGtag(dataLayer)
  gtag('config', 'G-TEST', { send_page_view: false })
  expect(Array.isArray(dataLayer[0])).toBe(false)
  expect(Array.from(dataLayer[0] as IArguments)).toEqual(['config', 'G-TEST', { send_page_view: false }])
})
