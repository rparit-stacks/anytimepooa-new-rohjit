"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AstrologerSignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<"info" | "otp">("info")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/astrologer/auth/me")
        if (response.ok) {
          // Already logged in, redirect to dashboard
          router.push("/astrologer-portal/dashboard")
        }
      } catch (error) {
        // Not logged in, continue with signup
      } finally {
        setCheckingAuth(false)
      }
    }
    checkAuth()
  }, [router])

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "",
    experience_years: "",
    languages: "",
    rate_per_session: "",
    bio: "",
  })

  const [otp, setOtp] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!formData.name || !formData.email || !formData.phone) {
      setError("Please fill all required fields")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address")
      return
    }

    if (formData.phone.length !== 10) {
      setError("Please enter a valid 10-digit phone number")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/astrologer/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Signup failed")
        setLoading(false)
        return
      }

      // OTP sent, move to verification step
      setStep("otp")

      // Show OTP in development
      if (data.otp) {
        alert(`Development Mode - OTP: ${data.otp}`)
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign up")
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
      const response = await fetch("/api/astrologer/auth/verify-signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, otp }),
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

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-[#ff6f1e] text-5xl mb-4"></i>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <Link
            href="/astrologer-portal/login"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-[#ff6f1e] mb-4"
          >
            <i className="fas fa-arrow-left"></i>
            Back to Login
          </Link>
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#ff6f1e] to-[#ff8c42] rounded-full shadow-xl flex items-center justify-center mb-4">
            <i className="fas fa-user-plus text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Join as Astrologer
          </h1>
          <p className="text-gray-600">
            {step === "info"
              ? "Fill in your details to get started"
              : "Enter OTP sent to your email"}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-slide-up">
          {step === "info" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-user mr-2 text-[#ff6f1e]"></i>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Your full name"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e] transition-colors"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-envelope mr-2 text-[#ff6f1e]"></i>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e] transition-colors"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-phone mr-2 text-[#ff6f1e]"></i>
                  Phone Number *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                    placeholder="10-digit number"
                    className="w-full pl-14 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e] transition-colors"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              {/* Specialization */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-star mr-2 text-[#ff6f1e]"></i>
                  Specialization
                </label>
                <select
                  value={formData.specialization}
                  onChange={(e) =>
                    setFormData({ ...formData, specialization: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e] transition-colors"
                >
                  <option value="">Select specialization</option>
                  <option value="Vedic Astrology">Vedic Astrology</option>
                  <option value="Numerology">Numerology</option>
                  <option value="Tarot Reading">Tarot Reading</option>
                  <option value="Palmistry">Palmistry</option>
                  <option value="Vastu">Vastu</option>
                  <option value="Horoscope">Horoscope</option>
                  <option value="KP Astrology">KP Astrology</option>
                  <option value="Nadi Astrology">Nadi Astrology</option>
                </select>
              </div>

              {/* Experience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-briefcase mr-2 text-[#ff6f1e]"></i>
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={formData.experience_years}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      experience_years: e.target.value,
                    })
                  }
                  placeholder="e.g., 5"
                  min="0"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e] transition-colors"
                />
              </div>

              {/* Languages */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-language mr-2 text-[#ff6f1e]"></i>
                  Languages Known
                </label>
                <input
                  type="text"
                  value={formData.languages}
                  onChange={(e) =>
                    setFormData({ ...formData, languages: e.target.value })
                  }
                  placeholder="e.g., Hindi, English, Tamil"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e] transition-colors"
                />
              </div>

              {/* Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-rupee-sign mr-2 text-[#ff6f1e]"></i>
                  Rate per Session (₹)
                </label>
                <input
                  type="number"
                  value={formData.rate_per_session}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rate_per_session: e.target.value,
                    })
                  }
                  placeholder="e.g., 500"
                  min="0"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e] transition-colors"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-align-left mr-2 text-[#ff6f1e]"></i>
                  Bio/About
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  placeholder="Tell us about yourself and your expertise..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e] transition-colors resize-none"
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
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] hover:from-[#ff5f0e] hover:to-[#ff7c32] text-white font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-paper-plane"></i>
                    Sign Up & Send OTP
                  </span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-lock mr-2 text-[#ff6f1e]"></i>
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e] transition-colors text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  required
                  autoFocus
                />
                <p className="text-sm text-gray-500 mt-2 text-center">
                  OTP sent to {formData.email}
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
                    Verify & Complete Signup
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("info")
                  setOtp("")
                  setError("")
                }}
                className="w-full py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Change Details
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/astrologer-portal/login"
              className="text-[#ff6f1e] hover:text-[#ff5f0e] font-medium"
            >
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
