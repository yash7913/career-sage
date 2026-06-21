'use client'
import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register in production — on localhost, the service worker
    // aggressively caches the app shell and can serve stale JS chunk
    // references after a rebuild, causing persistent 404s that survive
    // even a hard refresh. Real users on the deployed site should still
    // get the PWA caching benefits; local dev shouldn't fight the cache.
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silent failure — PWA features are an enhancement, not critical path
      })
    }
  }, [])

  return null
}