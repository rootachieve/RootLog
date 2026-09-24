import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyRelationLinks,
  createPostEntry,
  parseStructuredResponse,
  renderRecommendationIssue,
  renderReviewComment,
  selectArticleFiles,
} from './ai-content.mjs';

test('selects changed Markdown articles for review and only added articles for sync', () => {
  const files = [
    { filename: 'content/posts/new.md', status: 'added' },
    { filename: 'content/posts/edited.md', status: 'modified' },
    { filename: 'content/posts/old.md', status: 'removed' },
    { filename: 'content/posts/image.png', status: 'added' },
    { filename: 'README.md', status: 'modified' },
  ];

  assert.deepEqual(selectArticleFiles(files, 'review'), [
    'content/posts/edited.md',
    'content/posts/new.md',
  ]);
  assert.deepEqual(selectArticleFiles(files, 'sync'), ['content/posts/new.md']);
});

test('parses structured JSON from a Responses API output message', () => {
  const response = {
    output: [
      { type: 'reasoning', content: [] },
      {
        type: 'message',
        content: [{ type: 'output_text', text: '{"title":"테스트"}' }],
      },
    ],
  };

  assert.deepEqual(parseStructuredResponse(response), { title: '테스트' });
  assert.throws(() => parseStructuredResponse({ output: [] }), /structured output/i);
});

test('creates normalized RootLog metadata without inventing a thumbnail', () => {
  const entry = createPostEntry({
    title: '  새 글  ',
    summary: ' 요약 ',
    description: ' 설명 ',
    tags: [' React ', '', '테스트'],
    category: ' 프론트엔드 ',
    keywords: [' RootLog ', 'AI'],
  }, {
    id: 7,
    fileName: '007-new.md',
    publishedAt: '2026-09-23',
  });

  assert.deepEqual(entry, {
    id: 7,
    title: '새 글',
    publishedAt: '2026-09-23',
    summary: '요약',
    description: '설명',
    thumbnail: null,
    tags: ['React', '테스트'],
    category: '프론트엔드',
    keywords: ['RootLog', 'AI'],
    fileName: '007-new.md',
  });
});

test('adds validated undirected relation links and rejects unknown nodes', () => {
  const posts = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const existing = [{ from: 1, to: 2, relation: '보완', weight: 0.4 }];
  const merged = applyRelationLinks(posts, existing, 3, [
    { otherId: 2, relation: '확장', weight: 0.76, reason: '주제를 확장한다.' },
  ], new Set([1, 2]));

  assert.deepEqual(merged, [
    { from: 1, to: 2, relation: '보완', weight: 0.4 },
    { from: 2, to: 3, relation: '확장', weight: 0.76 },
  ]);
  assert.throws(
    () => applyRelationLinks(posts, existing, 3, [{ otherId: 99, relation: '보완', weight: 0.5 }], new Set([1, 2])),
    /unknown candidate/i,
  );
  assert.throws(
    () => applyRelationLinks(posts, existing, 3, [{ otherId: 2, relation: '유사', weight: 0.5 }], new Set([1, 2])),
    /unsupported relation/i,
  );
});

test('renders one actionable PR review comment including composition and completeness findings', () => {
  const body = renderReviewComment([
    {
      filePath: 'content/posts/new.md',
      overallAssessment: '핵심 주장은 보이지만 근거와 결론이 부족합니다.',
      findings: [
        {
          priority: 'P2',
          kind: '구성',
          excerpt: '캐시는 빠릅니다.',
          reason: '도입 뒤 바로 결론으로 넘어갑니다.',
          suggestion: '문제 상황과 측정 결과를 중간에 추가하세요.',
        },
        {
          priority: 'P3',
          kind: '완성도',
          excerpt: '끝',
          reason: '독자가 적용할 기준이 없습니다.',
          suggestion: '사용 조건과 주의점을 결론에 정리하세요.',
        },
      ],
    },
  ]);

  assert.match(body, /<!-- rootlog-ai-review -->/);
  assert.match(body, /핵심 주장은 보이지만 근거와 결론이 부족합니다/);
  assert.match(body, /\[P2\] \[구성\]/);
  assert.match(body, /\[P3\] \[완성도\]/);
  assert.match(body, /문제 상황과 측정 결과를 중간에 추가하세요/);
});

test('renders three next-topic recommendations as an issue tied to the merged PR', () => {
  const { title, body } = renderRecommendationIssue(42, 'https://github.com/root/blog/pull/42', [
    { title: '주제 1', rationale: '이유 1', relatedPostIds: [1, 2], category: '백엔드', hints: ['힌트 A'] },
    { title: '주제 2', rationale: '이유 2', relatedPostIds: [], category: '데이터', hints: ['힌트 B'] },
    { title: '주제 3', rationale: '이유 3', relatedPostIds: [3], category: '인프라', hints: ['힌트 C'] },
  ]);

  assert.equal(title, 'AI 추천 학습 주제 for PR #42');
  assert.match(body, /병합된 PR: \[#42\]/);
  assert.match(body, /1\. 주제 1/);
  assert.match(body, /관련 글 ID: 1, 2/);
  assert.match(body, /3\. 주제 3/);
});
