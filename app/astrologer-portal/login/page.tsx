"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AstrologerLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [otpSent, setOtpSent] = useState(false)

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/astrologer/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to send OTP")
        setLoading(false)
        return
      }

      setOtpSent(true)
      setStep("otp")

      // Show OTP in development
      if (data.otp) {
        alert(`Development Mode - OTP: ${data.otp}`)
      }
    } catch (err: any) {
      setError(err.message || "Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/astrologer/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Invalid OTP")
        setLoading(false)
        return
      }

      // Success! Redirect to dashboard
      router.push("/astrologer-portal/dashboard")
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#ff6f1e] to-[#ff8c42] rounded-full shadow-xl flex items-center justify-center mb-4">
            <i className="fas fa-star text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Astrologer Portal
          </h1>
          <p className="text-gray-600">
            {step === "email" ? "Enter your email address" : "Enter OTP sent to your email"}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-slide-up">
          {step === "email" ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-envelope mr-2 text-[#ff6f1e]"></i>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e] transition-colors"
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                  <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] hover:from-[#ff5f0e] hover:to-[#ff7c32] text-white font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i>
                    Sending OTP...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-paper-plane"></i>
                    Send OTP
                  </span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-lock mr-2 text-[#ff6f1e]"></i>
                  Enter OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e] transition-colors text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  required
                  autoFocus
                />
                <p className="text-sm text-gray-500 mt-2 text-center">
                  OTP sent to {email}
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                  <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] hover:from-[#ff5f0e] hover:to-[#ff7c32] text-white font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i>
                    Verifying...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-check-circle"></i>
                    Verify & Login
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("email")
                  setOtp("")
                  setError("")
                }}
                className="w-full py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Change Email Address
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-3">
          <p className="text-sm text-gray-500">
            <i className="fas fa-shield-alt mr-1 text-[#ff6f1e]"></i>
            Secure Astrologer Login
          </p>
          <div className="text-sm text-gray-600">
            <p>New to our platform?</p>
            <Link
              href="/astrologer-portal/signup"
              className="text-[#ff6f1e] hover:text-[#ff5f0e] font-semibold"
            >
              Sign up as an Astrologer
              <i className="fas fa-arrow-right ml-1"></i>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
