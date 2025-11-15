"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "./navbar"

// Global navbar that's always visible (even during loading)
// Hidden on auth pages, home page, and astrologer portal
export function GlobalNavbar() {
  const pathname = usePathname()

  // CRITICAL: Don't show USER navbar on astrologer portal or session pages
  // Astrologer portal is a SEPARATE APPLICATION with its own navigation
  // Session pages are FULLSCREEN - no navbar needed (for both user and astrologer)
  // The two portals must remain completely isolated
  const hideNavbar =
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/astrologer-portal") ||
    pathname?.startsWith("/session") ||  // Hide navbar on session pages
    pathname === "/"

  if (hideNavbar) {
    return null
  }

  return <Navbar />
}

