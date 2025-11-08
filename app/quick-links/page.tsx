"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { vibrate } from "@/lib/vibration"
import Link from "next/link"

export default function QuickLinksPage() {
  const router = useRouter()

  const quickLinks = [
    { href: "/dashboard", icon: "fa-home", label: "Dashboard", description: "Go to home" },
    { href: "/wallet", icon: "fa-wallet", label: "Wallet", description: "Manage your balance" },
    { href: "/astrologers", icon: "fa-star", label: "Astrologers", description: "Find astrologers" },
    { href: "/ecommerce", icon: "fa-shopping-bag", label: "Shop", description: "Browse products" },
    { href: "/profile", icon: "fa-user", label: "Profile", description: "Edit your profile" },
    { href: "/terms-conditions", icon: "fa-file-contract", label: "Terms & Conditions", description: "Read our terms" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 pb-24" style={{ paddingBottom: "6rem" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 p-4 bg-white border-b border-gray-200 safe-area-top relative">
        <button
          onClick={() => {
            vibrate()
            router.back()
          }}
          className="text-gray-600 active:scale-95 transition-transform"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Quick Links</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => vibrate()}
            className="block bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <i className={`fas ${link.icon} text-orange-600 text-xl`}></i>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{link.label}</h3>
                <p className="text-sm text-gray-600">{link.description}</p>
              </div>
              <i className="fas fa-chevron-right text-gray-400"></i>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}


