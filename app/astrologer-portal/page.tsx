"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function AstrologerSplashPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if already logged in
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/astrologer/auth/me")
        if (response.ok) {
          // Already logged in, redirect to dashboard
          router.push("/astrologer-portal/dashboard")
        } else {
          // Not logged in, redirect to login after delay
          setTimeout(() => {
            router.push("/astrologer-portal/login")
          }, 2500)
        }
      } catch (error) {
        // Error checking auth, redirect to login
        setTimeout(() => {
          router.push("/astrologer-portal/login")
        }, 2500)
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ff6f1e] via-[#ff8c42] to-[#ff6f1e] flex flex-col items-center justify-center p-4">
      {/* Animated stars background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center animate-fade-in">
        {/* Logo */}
        <div className="mb-8 animate-scale-in">
          <div className="w-32 h-32 mx-auto bg-white rounded-full shadow-2xl flex items-center justify-center mb-6">
            <i className="fas fa-star text-[#ff6f1e] text-6xl animate-pulse-soft"></i>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 drop-shadow-lg">
            AstroTalk
          </h1>
          <p className="text-xl text-white/90 font-medium">
            Astrologer Portal
          </p>
        </div>

        {/* Loading animation */}
        <div className="flex items-center justify-center gap-2 mt-12">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
        </div>

        {/* Welcome text */}
        <p className="mt-8 text-white/80 text-lg">
          Welcome back, Astrologer
        </p>
      </div>

      <style jsx>{`
        .stars,
        .stars2,
        .stars3 {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          display: block;
        }

        .stars {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23ffffff' opacity='0.3'/%3E%3C/svg%3E")
            repeat;
          animation: animStar 50s linear infinite;
        }

        .stars2 {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6' viewBox='0 0 6 6'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23ffffff' opacity='0.2'/%3E%3C/svg%3E")
            repeat;
          animation: animStar 100s linear infinite;
        }

        .stars3 {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23ffffff' opacity='0.1'/%3E%3C/svg%3E")
            repeat;
          animation: animStar 150s linear infinite;
        }

        @keyframes animStar {
          from {
            transform: translateY(0px);
          }
          to {
            transform: translateY(-2000px);
          }
        }
      `}</style>
    </div>
  )
}
