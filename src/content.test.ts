import { expect, test } from 'vitest'
import { getPostMarkdown, posts } from './content'

test('loads a post body on demand', async () => {
  const loading = getPostMarkdown(posts[0])
  expect(loading).toBeInstanceOf(Promise)
  await expect(loading).resolves.toContain('# RootLog 시작')
})
