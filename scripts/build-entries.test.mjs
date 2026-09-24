import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import { buildEntries, validateContent } from './build-entries.mjs';

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'rootlog-entries-'));
  roots.push(root);
  const contentDir = join(root, 'content');
  const distDir = join(root, 'dist');
  mkdirSync(join(contentDir, 'posts'), { recursive: true });
  mkdirSync(distDir);
  const post = {
    id: 1,
    title: '첫 글 & 기록',
    publishedAt: '2026-03-03',
    summary: '요약',
    description: '읽기 <좋은> 글',
    thumbnail: '/images/rootlog-start.jpg',
    tags: ['intro'],
    category: '기본',
    keywords: ['RootLog'],
    fileName: 'first.md',
  };
  writeFileSync(join(contentDir, 'posts', 'first.md'), '# 첫 글');
  writeFileSync(join(contentDir, 'posts.json'), JSON.stringify([post]));
  writeFileSync(join(contentDir, 'relations.json'), '[]');
  writeFileSync(join(distDir, 'index.html'), '<!doctype html><html><head><title>RootLog</title><script type="module" src="/assets/main.js"></script></head><body><div id="root"></div></body></html>');
  return { contentDir, distDir, post };
}

test('rejects duplicate, nonpositive post IDs and invalid dates', () => {
  const { contentDir, post } = fixture();
  const postsDir = join(contentDir, 'posts');
  assert.throws(() => validateContent([post, { ...post }], [], postsDir), /duplicate.*1/i);
  assert.throws(() => validateContent([{ ...post, id: 0 }], [], postsDir), /id.*positive/i);
  assert.throws(() => validateContent([{ ...post, publishedAt: '2026-02-30' }], [], postsDir), /date/i);
});

test('rejects missing Markdown files and unsafe filenames', () => {
  const { contentDir, post } = fixture();
  const postsDir = join(contentDir, 'posts');
  assert.throws(() => validateContent([{ ...post, fileName: 'missing.md' }], [], postsDir), /Markdown file/i);
  assert.throws(() => validateContent([{ ...post, fileName: '../first.md' }], [], postsDir), /fileName/i);
});

test('rejects relation endpoints outside posts and weights outside 0–1', () => {
  const { contentDir, post } = fixture();
  const postsDir = join(contentDir, 'posts');
  assert.throws(() => validateContent([post], [{ from: 1, to: 2, relation: '관련', weight: 0.5 }], postsDir), /endpoint/i);
  assert.throws(() => validateContent([post], [{ from: 1, to: 1, relation: '관련', weight: 1.1 }], postsDir), /weight/i);
});

test('creates direct-entry pages with escaped post metadata and root asset paths', () => {
  const { contentDir, distDir } = fixture();
  buildEntries({ contentDir, distDir });
  const graph = readFileSync(join(distDir, 'graph', 'index.html'), 'utf8');
  const post = readFileSync(join(distDir, 'posts', '1', 'index.html'), 'utf8');
  const fallback = readFileSync(join(distDir, '404.html'), 'utf8');
  assert.match(graph, /<title>관계 그래프 \| RootLog<\/title>/);
  assert.match(post, /<title>첫 글 &amp; 기록 \| RootLog<\/title>/);
  assert.match(post, /name="description" content="읽기 &lt;좋은&gt; 글"/);
  assert.match(post, /property="og:image" content="https:\/\/rootachieve.github.io\/images\/rootlog-start.jpg"/);
  assert.match(post, /src="\/assets\/main.js"/);
  assert.equal(fallback, readFileSync(join(distDir, 'index.html'), 'utf8'));
});

test('does not generate pages when content validation fails', () => {
  const { contentDir, distDir, post } = fixture();
  writeFileSync(join(contentDir, 'posts.json'), JSON.stringify([{ ...post, fileName: 'missing.md' }]));
  assert.throws(() => buildEntries({ contentDir, distDir }), /Markdown file/i);
  assert.throws(() => readFileSync(join(distDir, 'graph', 'index.html')), /ENOENT/);
});
