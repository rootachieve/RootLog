import { expect, it } from 'vitest'
import { createPageViewTracker } from './analytics'

it('sends one view per route entry but counts a return visit', () => {
  const paths: string[] = []
  const track = createPageViewTracker((path) => paths.push(path))
  track('/posts/1/')
  track('/posts/1/')
  track('/graph/')
  track('/posts/1/')
  expect(paths).toEqual(['/posts/1/', '/graph/', '/posts/1/'])
})
