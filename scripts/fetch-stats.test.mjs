import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStats, yesterdayInSeoul } from './fetch-stats.mjs';

const now = new Date('2026-09-23T01:00:00.000Z');
const row = (value, path) => ({
  ...(path ? { dimensionValues: [{ value: path }] } : {}),
  metricValues: [{ value: String(value) }],
});

test('uses the previous calendar day in Asia/Seoul', () => {
  assert.equal(yesterdayInSeoul(new Date('2026-09-22T14:59:00Z')), '2026-09-21');
  assert.equal(yesterdayInSeoul(now), '2026-09-22');
});

test('maps only known article paths and keeps confirmed zeroes', () => {
  assert.deepEqual(buildStats({
    now,
    postIds: [1, 2],
    totalReport: { rows: [row(25)] },
    yesterdayReport: { rows: [row(3)] },
    viewsReport: { rows: [
      row(7, '/posts/1/'),
      row(2, '/posts/1'),
      row(0, '/posts/2/'),
      row(42, '/posts/3/'),
      row(11, '/graph/'),
    ] },
  }), {
    updatedAt: '2026-09-23T01:00:00.000Z',
    visitorDate: '2026-09-22',
    totalVisitors: 25,
    yesterdayVisitors: 3,
    postViews: { 1: 9, 2: 0 },
  });
});

test('an empty GA4 result remains unavailable, never a fabricated zero', () => {
  const stats = buildStats({
    now,
    postIds: [1],
    totalReport: { rowCount: 0 },
    yesterdayReport: { rows: [] },
    viewsReport: { rowCount: 0 },
  });
  assert.equal(stats.totalVisitors, null);
  assert.equal(stats.yesterdayVisitors, null);
  assert.deepEqual(stats.postViews, {});
});

test('malformed and truncated reports fail instead of publishing misleading stats', () => {
  const reports = {
    now,
    postIds: [1],
    totalReport: { rows: [row(1)] },
    yesterdayReport: { rows: [row(1)] },
    viewsReport: { rows: [row(1, '/posts/1/')] },
  };
  assert.throws(() => buildStats({ ...reports, totalReport: { rows: [row('NaN')] } }), /Invalid GA4 metric/);
  assert.throws(() => buildStats({ ...reports, totalReport: { rowCount: 1, rows: [] } }), /row count/);
  assert.throws(() => buildStats({ ...reports, viewsReport: { rowCount: 2, rows: [row(1, '/posts/1/')] } }), /truncated/);
});
