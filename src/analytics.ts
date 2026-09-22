declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function createPageViewTracker(send: (path: string, title: string) => void) {
  let previousPath: string | null = null
  return (path: string, title = 'RootLog') => {
    if (path === previousPath) return
    previousPath = path
    send(path, title)
  }
}

let initialized = false
const track = createPageViewTracker((path, title) => {
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: `${window.location.origin}${path}`,
    page_title: title,
  })
})

export function trackPageView(path: string, title: string) {
  const id = import.meta.env.VITE_GA4_MEASUREMENT_ID
  if (!id) return
  if (!initialized) {
    initialized = true
    window.dataLayer = window.dataLayer ?? []
    window.gtag = (...args: unknown[]) => { window.dataLayer?.push(args) }
    window.gtag('js', new Date())
    window.gtag('config', id, { send_page_view: false })
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    document.head.appendChild(script)
  }
  track(path, title)
}
