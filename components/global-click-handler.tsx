"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { vibrate } from "@/lib/vibration"

export function GlobalClickHandler() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Add vibration to all clickable elements
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Check if clicked element is interactive
      const isInteractive = 
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest("[role='button']") ||
        target.closest("[onclick]") ||
        target.closest(".cursor-pointer")
      
      if (isInteractive) {
        vibrate(50)
      }
    }

    // Add click listener
    document.addEventListener("click", handleClick, true)

    return () => {
      document.removeEventListener("click", handleClick, true)
    }
  }, [pathname])

  return null
}

