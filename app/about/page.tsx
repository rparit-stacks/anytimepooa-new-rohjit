"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { vibrate } from "@/lib/vibration"

export default function AboutPage() {
  const router = useRouter()

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
        <h1 className="text-2xl font-bold text-gray-900">About Us</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        <div className="text-center mb-8">
          <img
            src="/logono.png"
            alt="AstroTalk"
            className="w-24 h-24 rounded-full mx-auto mb-4 shadow-lg"
          />
          <h2 className="text-3xl font-bold mb-2">AstroTalk</h2>
          <p className="text-orange-600 font-semibold mb-4">Anytime Pooja</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Our Mission</h3>
          <p className="text-gray-700 mb-4">
            AstroTalk is dedicated to bringing cosmic wisdom and spiritual guidance to everyone, anytime, anywhere.
            We connect you with expert astrologers and provide personalized insights into your life's journey.
          </p>

          <h3 className="text-xl font-bold mt-6 mb-4">What We Offer</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle text-orange-600 mt-1"></i>
              <span>Expert astrology consultations</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle text-orange-600 mt-1"></i>
              <span>Birth chart analysis and Kundli reports</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle text-orange-600 mt-1"></i>
              <span>Daily horoscopes and predictions</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle text-orange-600 mt-1"></i>
              <span>Compatibility checks and relationship guidance</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle text-orange-600 mt-1"></i>
              <span>Spiritual products and services</span>
            </li>
          </ul>

          <h3 className="text-xl font-bold mt-6 mb-4">Contact Information</h3>
          <div className="space-y-2 text-gray-700">
            <p className="flex items-center gap-2">
              <i className="fas fa-envelope text-orange-600"></i>
              support@astrotalk.com
            </p>
            <p className="flex items-center gap-2">
              <i className="fas fa-phone text-orange-600"></i>
              +91-XXXX-XXXXXX
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


