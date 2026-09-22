import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FIRST_GA4_DATE = '2020-01-01';

export function yesterdayInSeoul(now) {
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(yesterday).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function metric(row) {
  const value = row?.metricValues?.[0]?.value;
  if (!/^\d+$/.test(value ?? '')) throw new Error('Invalid GA4 metric value');
  const count = Number(value);
  if (!Number.isSafeInteger(count)) throw new Error('GA4 metric exceeds safe integer range');
  return count;
}

function reportTotal(report) {
  if (!Array.isArray(report?.rows)) {
    if (Number(report?.rowCount) === 0) return null;
    throw new Error('Invalid GA4 report response');
  }
  if (Number(report.rowCount ?? report.rows.length) !== report.rows.length || report.rows.length > 1) {
    throw new Error('Invalid GA4 total report row count');
  }
  if (report.rows.length === 0) return null;
  return metric(report.rows[0]);
}

export function buildStats({ now, postIds, totalReport, yesterdayReport, viewsReport }) {
  const ids = new Set(postIds.map(String));
  const postViews = {};
  if (!Array.isArray(viewsReport?.rows)) {
    if (Number(viewsReport?.rowCount) !== 0) throw new Error('Invalid GA4 views response');
  } else {
    if (Number(viewsReport.rowCount ?? viewsReport.rows.length) > viewsReport.rows.length) {
      throw new Error('GA4 views report was truncated');
    }
    for (const row of viewsReport.rows) {
      const path = row?.dimensionValues?.[0]?.value;
      const match = /^\/posts\/(\d+)\/?$/.exec(path ?? '');
      if (!match || !ids.has(match[1])) continue;
      const count = (postViews[match[1]] ?? 0) + metric(row);
      if (!Number.isSafeInteger(count)) throw new Error('GA4 post views exceed safe integer range');
      postViews[match[1]] = count;
    }
  }

  return {
    updatedAt: now.toISOString(),
    visitorDate: yesterdayInSeoul(now),
    totalVisitors: reportTotal(totalReport),
    yesterdayVisitors: reportTotal(yesterdayReport),
    postViews,
  };
}

async function main() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!/^\d+$/.test(propertyId ?? '')) throw new Error('GA4_PROPERTY_ID must be numeric');

  const posts = JSON.parse(await readFile('content/posts.json', 'utf8'));
  if (!Array.isArray(posts) || posts.some((post) => !Number.isSafeInteger(post.id))) {
    throw new Error('content/posts.json must contain posts with numeric IDs');
  }

  const now = new Date();
  const yesterday = yesterdayInSeoul(now);
  const property = `properties/${propertyId}`;
  const analytics = await import('@google-analytics/data');
  const { BetaAnalyticsDataClient } = analytics.default ?? analytics;
  const client = new BetaAnalyticsDataClient();

  const [totalReport, yesterdayReport, viewsReport] = await Promise.all([
    client.runReport({
      property,
      dateRanges: [{ startDate: FIRST_GA4_DATE, endDate: yesterday }],
      metrics: [{ name: 'totalUsers' }],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: yesterday, endDate: yesterday }],
      metrics: [{ name: 'totalUsers' }],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: FIRST_GA4_DATE, endDate: yesterday }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      limit: '250000',
    }),
  ]);

  const stats = buildStats({
    now,
    postIds: posts.map(({ id }) => id),
    totalReport: totalReport[0],
    yesterdayReport: yesterdayReport[0],
    viewsReport: viewsReport[0],
  });
  await writeFile('public/stats.json', `${JSON.stringify(stats, null, 2)}\n`);
  console.log(`GA4 snapshot written for ${stats.visitorDate}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
