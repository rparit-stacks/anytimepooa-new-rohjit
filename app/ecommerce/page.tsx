"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react"
import Link from "next/link"
import { vibrate } from "@/lib/vibration"
import { checkSession } from "@/lib/client-auth"

export default function EcommercePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const isLoggedIn = await checkSession()
      if (!isLoggedIn) {
        router.push("/auth/login")
      } else {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const ecommerceUrl = process.env.NEXT_PUBLIC_ECOMMERCE_URL || "https://example.com/shop"

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white pb-24" style={{ paddingBottom: "6rem" }}>
        <div className="text-center">
          <Loader2 className="animate-spin text-orange-600 mx-auto mb-4" size={32} />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-24 relative overflow-x-hidden" style={{ paddingBottom: "6rem" }}>
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
        
        {/* Floating Icons */}
        <div className="absolute top-1/4 left-1/4 text-orange-400/20 animate-bounce" style={{ animationDuration: "3s" }}>
          <i className="fas fa-shopping-bag text-3xl"></i>
        </div>
        <div className="absolute top-1/3 right-1/4 text-pink-400/20 animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>
          <i className="fas fa-shopping-cart text-2xl"></i>
        </div>
        <div className="absolute bottom-1/3 left-1/3 text-yellow-400/20 animate-bounce" style={{ animationDuration: "5s", animationDelay: "2s" }}>
          <i className="fas fa-store text-2xl"></i>
        </div>
      </div>

      {/* Iframe Container - No Header */}
      <div className="w-full h-screen bg-white relative z-10">
        <iframe src={ecommerceUrl} className="w-full h-full border-none" title="E-Commerce Shop" />
      </div>

    </div>
  )
}
