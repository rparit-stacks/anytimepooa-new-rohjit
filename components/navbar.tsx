"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { vibrate } from "@/lib/vibration"
import { SidebarMenu } from "./sidebar-menu"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
      router.push("/auth/login")
    }
  }

  const navItems = [
    { href: "/dashboard", faIcon: "fa-home", label: "Home" },
    { href: "/wallet", faIcon: "fa-wallet", label: "Wallet" },
    { href: "/astrologers", faIcon: "fa-star", label: "Astrologers" },
    { href: "/ecommerce", faIcon: "fa-shopping-bag", label: "Shop" },
    { href: "/profile", faIcon: "fa-user", label: "Profile" },
  ]

  const handleVibrate = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(50) // 50ms vibration
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom z-50 shadow-lg" style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}>
      <div className="flex justify-around items-center h-20 px-2 max-w-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleVibrate}
              className={`flex flex-col items-center gap-1 transition-all transform active:scale-95 ${
                isActive
                  ? "text-orange-600 dark:text-orange-500 font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500"
              }`}
            >
              <i className={`fas ${item.faIcon} text-xl ${isActive ? "animate-pulse" : ""}`}></i>
              <span className="text-xs">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function TopNavbar({ userName, onMenuClick }: { userName?: string; onMenuClick?: () => void }) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [notifications, setNotifications] = useState(3) // Mock notification count

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
      router.push("/auth/login")
    }
  }

  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <img
              src="/logono.png"
              alt="AstroTalk"
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-lg"
            />
            <div className="flex flex-col">
              <h1 className="text-lg sm:text-xl font-bold hidden sm:block">AstroTalk</h1>
              <span className="text-xs text-orange-600 font-semibold">Anytime Pooja</span>
            </div>
          </Link>
        </div>

        {/* Mobile: Notifications + Three Menu */}
        <div className="flex items-center gap-3 sm:hidden">
          <button
            onClick={() => vibrate()}
            className="relative p-2 text-gray-600 hover:text-orange-600 transition-colors active:scale-95"
          >
            <i className="fas fa-bell text-xl"></i>
            {notifications > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              vibrate()
              if (onMenuClick) {
                onMenuClick()
              } else {
                setShowSidebar(true)
              }
            }}
            className="p-2 text-gray-600 hover:text-orange-600 transition-colors active:scale-95"
          >
            <i className="fas fa-bars text-xl"></i>
          </button>
        </div>

        {/* Desktop: Notifications + Three Menu + Welcome + Logout */}
        <div className="hidden sm:flex items-center gap-4">
          <button
            onClick={() => vibrate()}
            className="relative p-2 text-gray-600 hover:text-orange-600 transition-colors"
          >
            <i className="fas fa-bell text-lg"></i>
            {notifications > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {notifications}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              vibrate()
              if (onMenuClick) {
                onMenuClick()
              } else {
                setShowSidebar(true)
              }
            }}
            className="p-2 text-gray-600 hover:text-orange-600 transition-colors"
          >
            <i className="fas fa-bars text-lg"></i>
          </button>
          {userName && (
            <div className="text-sm text-muted-foreground">
              Welcome, <span className="font-semibold text-foreground">{userName}</span>
            </div>
          )}
          <div className="text-xs text-orange-600 font-semibold">Anytime Pooja</div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="rounded-full gap-2 border-primary/30 hover:border-primary hover:bg-primary/5 bg-transparent"
          >
            <LogOut size={18} strokeWidth={2} />
            <span>Logout</span>
          </Button>
        </div>
      </div>

      {/* Sidebar Menu */}
      <SidebarMenu isOpen={showSidebar} onClose={() => setShowSidebar(false)} userName={userName} />
    </header>
  )
}

