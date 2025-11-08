"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { vibrate } from "@/lib/vibration"

export default function PrivacyPolicyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white pb-24" style={{ paddingBottom: "6rem" }}>
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
        <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        <div className="prose max-w-none">
          <h2 className="text-2xl font-bold mb-4">Privacy Policy</h2>
          <p className="text-gray-700 mb-4">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h3>
          <p className="text-gray-700 mb-4">
            We collect information that you provide directly to us, including name, email, phone number, and location data.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">2. How We Use Your Information</h3>
          <p className="text-gray-700 mb-4">
            We use your information to provide, maintain, and improve our services, process transactions, and communicate with you.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">3. Data Security</h3>
          <p className="text-gray-700 mb-4">
            We implement appropriate security measures to protect your personal information against unauthorized access.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">4. Cookies</h3>
          <p className="text-gray-700 mb-4">
            We use cookies to enhance your experience. You can choose to disable cookies through your browser settings.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">5. Your Rights</h3>
          <p className="text-gray-700 mb-4">
            You have the right to access, update, or delete your personal information at any time.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">6. Contact Us</h3>
          <p className="text-gray-700 mb-4">
            For privacy-related questions, contact us at privacy@astrotalk.com
          </p>
        </div>
      </div>
    </div>
  )
}


