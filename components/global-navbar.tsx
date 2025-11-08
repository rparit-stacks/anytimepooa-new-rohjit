"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "./navbar"

// Global navbar that's always visible (even during loading)
// Hidden on auth pages
export function GlobalNavbar() {
  const pathname = usePathname()
  
  // Don't show navbar on auth pages or home page
  const hideNavbar = pathname?.startsWith("/auth") || pathname === "/"
  
  if (hideNavbar) {
    return null
  }
  
  return <Navbar />
}

