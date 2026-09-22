import postData from '../content/posts.json';
import relationData from '../content/relations.json';
import type { PostMeta, Relation } from './types';

const markdownFiles = import.meta.glob('../content/posts/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

export const posts: PostMeta[] = [...(postData as PostMeta[])].sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt) || b.id - a.id,
);
export const relations: Relation[] = relationData as Relation[];

export function getPost(id: number): PostMeta | undefined {
  return posts.find((post) => post.id === id);
}

export function getPostMarkdown(post: PostMeta): Promise<string> {
  return markdownFiles[`../content/posts/${post.fileName}`]?.() ?? Promise.resolve('');
}
