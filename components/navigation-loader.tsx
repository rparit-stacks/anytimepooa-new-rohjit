"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { LoadingOverlay } from "./loading-overlay"

export function NavigationLoader() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      setLoading(false)
    }, 300) // Short delay for smooth transition

    return () => clearTimeout(timer)
  }, [pathname])

  if (!loading) return null

  return <LoadingOverlay />
}


