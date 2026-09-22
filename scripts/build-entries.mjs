import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteUrl = 'https://rootachieve.github.io';

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

function assertText(value, field, id) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Post ${id}: ${field} must be nonempty text`);
}

export function validateContent(posts, relations, postsDir) {
  if (!Array.isArray(posts) || !Array.isArray(relations)) throw new Error('Posts and relations must be arrays');
  const ids = new Set();
  for (const post of posts) {
    if (!post || !Number.isSafeInteger(post.id) || post.id <= 0) throw new Error('Post id must be a positive integer');
    if (ids.has(post.id)) throw new Error(`Duplicate post id ${post.id}`);
    ids.add(post.id);
    for (const field of ['title', 'summary', 'description', 'category']) assertText(post[field], field, post.id);
    if (!validDate(post.publishedAt)) throw new Error(`Post ${post.id}: invalid publishedAt date`);
    if (!Array.isArray(post.tags) || !post.tags.every((tag) => typeof tag === 'string') ||
        !Array.isArray(post.keywords) || !post.keywords.every((keyword) => typeof keyword === 'string')) {
      throw new Error(`Post ${post.id}: tags and keywords must be text arrays`);
    }
    if (post.thumbnail !== null && typeof post.thumbnail !== 'string') throw new Error(`Post ${post.id}: thumbnail must be a path or null`);
    if (typeof post.fileName !== 'string' || basename(post.fileName) !== post.fileName ||
        post.fileName.startsWith('.') || !post.fileName.endsWith('.md')) {
      throw new Error(`Post ${post.id}: invalid fileName`);
    }
    const markdownPath = join(postsDir, post.fileName);
    if (!existsSync(markdownPath) || !statSync(markdownPath).isFile()) throw new Error(`Post ${post.id}: Markdown file missing: ${post.fileName}`);
  }
  for (const relation of relations) {
    if (!relation || !ids.has(relation.from) || !ids.has(relation.to)) throw new Error('Relation endpoint must refer to an existing post');
    if (typeof relation.relation !== 'string' || !relation.relation.trim()) throw new Error('Relation type must be nonempty text');
    if (typeof relation.weight !== 'number' || !Number.isFinite(relation.weight) || relation.weight < 0 || relation.weight > 1) {
      throw new Error('Relation weight must be between 0 and 1');
    }
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function entryHtml(rootHtml, { title, description, path, image, type }) {
  const fullTitle = `${title} | RootLog`;
  const tags = [
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<meta property="og:title" content="${escapeHtml(fullTitle)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:url" content="${siteUrl}${path}">`,
    ...(image ? [`<meta property="og:image" content="${escapeHtml(new URL(image, siteUrl).href)}">`] : []),
  ].join('\n');
  return rootHtml
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`)
    .replace(/<meta\s+name=["']description["'][^>]*>/i, '')
    .replace('</head>', `${tags}\n</head>`);
}

export function buildEntries({ contentDir = resolve('content'), distDir = resolve('dist') } = {}) {
  const posts = JSON.parse(readFileSync(join(contentDir, 'posts.json'), 'utf8'));
  const relations = JSON.parse(readFileSync(join(contentDir, 'relations.json'), 'utf8'));
  validateContent(posts, relations, join(contentDir, 'posts'));
  const rootHtml = readFileSync(join(distDir, 'index.html'), 'utf8');
  const writeEntry = (path, html) => {
    const directory = join(distDir, path);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'index.html'), html);
  };
  writeEntry('graph', entryHtml(rootHtml, {
    title: '관계 그래프', description: 'RootLog 글 사이의 관계를 탐색합니다.', path: '/graph/', type: 'website',
  }));
  for (const post of posts) {
    writeEntry(join('posts', String(post.id)), entryHtml(rootHtml, {
      title: post.title, description: post.description, path: `/posts/${post.id}/`, image: post.thumbnail, type: 'article',
    }));
  }
  writeFileSync(join(distDir, '404.html'), rootHtml);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) buildEntries();
