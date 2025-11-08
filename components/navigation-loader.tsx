"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { LoadingOverlay } from "./loading-overlay"

export function NavigationLoader() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Show loading when pathname changes (navigation happens)
    setLoading(true)
    const timer = setTimeout(() => {
      setLoading(false)
    }, 500) // Show loading for 500ms during navigation

    return () => clearTimeout(timer)
  }, [pathname])

  // Also handle link clicks to show loading immediately
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest("a[href]") as HTMLAnchorElement
      
      if (link && link.href) {
        try {
          const url = new URL(link.href)
          const currentUrl = new URL(window.location.href)
          
          // Only show loading if navigating to a different page
          if (url.pathname !== currentUrl.pathname && !link.target && url.origin === currentUrl.origin) {
            setLoading(true)
            // Auto-hide after max 2 seconds if page doesn't change
            setTimeout(() => setLoading(false), 2000)
          }
        } catch (err) {
          // Invalid URL, ignore
        }
      }
    }

    document.addEventListener("click", handleLinkClick, true)

    return () => {
      document.removeEventListener("click", handleLinkClick, true)
    }
  }, [])

  if (!loading) return null

  return <LoadingOverlay />
}


