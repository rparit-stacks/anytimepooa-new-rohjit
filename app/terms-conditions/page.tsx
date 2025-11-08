"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { vibrate } from "@/lib/vibration"

export default function TermsConditionsPage() {
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
        <h1 className="text-2xl font-bold text-gray-900">Terms & Conditions</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        <div className="prose max-w-none">
          <h2 className="text-2xl font-bold mb-4">Terms of Service</h2>
          <p className="text-gray-700 mb-4">
            Welcome to AstroTalk. By accessing and using our services, you agree to be bound by these Terms and Conditions.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">1. Service Description</h3>
          <p className="text-gray-700 mb-4">
            AstroTalk provides astrology consultation services, including but not limited to birth chart analysis, horoscope readings, and compatibility checks.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">2. User Responsibilities</h3>
          <p className="text-gray-700 mb-4">
            Users are responsible for providing accurate information and maintaining the confidentiality of their account credentials.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">3. Payment Terms</h3>
          <p className="text-gray-700 mb-4">
            All payments are processed securely through our payment gateway. Refunds are subject to our refund policy.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">4. Privacy</h3>
          <p className="text-gray-700 mb-4">
            Your privacy is important to us. Please review our Privacy Policy to understand how we collect and use your information.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">5. Limitation of Liability</h3>
          <p className="text-gray-700 mb-4">
            AstroTalk provides services for informational purposes only. We are not liable for any decisions made based on our services.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">6. Contact Information</h3>
          <p className="text-gray-700 mb-4">
            For any questions regarding these terms, please contact us at support@astrotalk.com
          </p>
        </div>
      </div>
    </div>
  )
}


