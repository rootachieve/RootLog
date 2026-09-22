import { useEffect, useState } from 'react'

export type SiteStats = {
  updatedAt: string | null
  visitorDate: string | null
  totalVisitors: number | null
  yesterdayVisitors: number | null
  postViews: Record<string, number>
}

export function formatCount(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? new Intl.NumberFormat('ko-KR').format(value)
    : '—'
}

export function visitorDateLabel(date: string | null, now = new Date()): string {
  if (!date) return '어제 방문'
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now).map((part) => [part.type, part.value]),
  )
  const previous = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)))
  previous.setUTCDate(previous.getUTCDate() - 1)
  return date === previous.toISOString().slice(0, 10) ? '어제 방문' : `${date} 방문`
}

export function useStats(): SiteStats | null {
  const [stats, setStats] = useState<SiteStats | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/stats.json', { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Statistics unavailable')
        return response.json() as Promise<SiteStats>
      })
      .then(setStats)
      .catch(() => {})
    return () => controller.abort()
  }, [])
  return stats
}
