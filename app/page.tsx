"use client"

import Link from "next/link"
import { ChevronRight, Star, Sparkles, Moon } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { checkSession } from "@/lib/client-auth"

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsLoaded(true)
    
    // Check if user is already logged in, redirect to dashboard
    const checkAuth = async () => {
      const isLoggedIn = await checkSession()
      if (isLoggedIn) {
        router.push("/dashboard")
      }
    }
    checkAuth()
  }, [router])

  return (
    <main className="w-screen min-h-screen bg-gradient-to-br from-background via-background to-secondary flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-12 left-6 text-primary/20 animate-pulse-soft">
          <Star size={32} strokeWidth={1.5} />
        </div>
        <div className="absolute top-24 right-8 text-primary/15 animate-pulse-soft" style={{ animationDelay: "0.5s" }}>
          <Sparkles size={24} strokeWidth={1.5} />
        </div>
        <div className="absolute bottom-40 left-4 text-primary/10 animate-pulse-soft" style={{ animationDelay: "1s" }}>
          <Moon size={36} strokeWidth={1.5} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 text-center relative z-10 safe-area-horizontal safe-area-top">
        {/* Logo Area */}
        <div className={`mb-6 sm:mb-8 transition-all duration-1000 ${isLoaded ? "animate-fade-in" : "opacity-0"}`}>
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full gradient-astro flex items-center justify-center shadow-lg">
            <Sparkles size={32} className="text-white" strokeWidth={1.5} />
          </div>
        </div>

        {/* Heading */}
        <div className={`transition-all duration-1000 delay-100 ${isLoaded ? "animate-fade-in" : "opacity-0"}`}>
          <h1 className="text-3xl sm:text-5xl font-bold mb-2 sm:mb-4 text-foreground leading-tight text-pretty">
            Welcome to <span className="text-primary">AstroTalk</span>
          </h1>
        </div>

        {/* Subtitle */}
        <div
          className={`transition-all duration-1000 delay-200 ${isLoaded ? "animate-fade-in" : "opacity-0"}`}
          style={{ animationDelay: "200ms" }}
        >
          <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-12 max-w-md leading-relaxed">
            Unlock cosmic wisdom. Connect with astrology like never before.
          </p>
        </div>

        {/* CTA Buttons */}
        <div
          className={`flex flex-col gap-3 w-full px-0 sm:w-auto transition-all duration-1000 delay-300 ${
            isLoaded ? "animate-fade-in" : "opacity-0"
          }`}
        >
          <Link href="/auth/sign-up" className="w-full sm:w-auto">
            <button className="w-full px-6 sm:px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 touch-manipulation">
              Get Started <ChevronRight size={20} strokeWidth={2} />
            </button>
          </Link>
          <Link href="/auth/login" className="w-full sm:w-auto">
            <button className="w-full px-6 sm:px-8 py-3 rounded-full border-2 border-primary text-primary font-semibold hover:bg-primary/5 active:scale-95 transition-all duration-200 flex items-center justify-center touch-manipulation">
              Sign In
            </button>
          </Link>
        </div>
      </div>

      <footer className="border-t border-border py-4 px-4 text-center text-xs sm:text-sm text-muted-foreground safe-area-bottom safe-area-horizontal">
        <p>Explore the universe. Discover yourself.</p>
      </footer>
    </main>
  )
}
