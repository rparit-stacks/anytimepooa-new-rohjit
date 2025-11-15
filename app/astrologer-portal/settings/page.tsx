"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AstrologerSettingsPage() {
  const router = useRouter()
  const [astrologer, setAstrologer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/astrologer/auth/me")
      if (!response.ok) {
        router.push("/astrologer-portal/login")
        return
      }

      const data = await response.json()
      setAstrologer(data.astrologer)
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to logout?")) return

    try {
      await fetch("/api/astrologer/auth/logout", { method: "POST" })
      router.push("/astrologer-portal/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const handleClearCache = () => {
    if (confirm("This will clear app cache and reload the page. Continue?")) {
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name)
          })
        })
      }
      window.location.reload()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-[#ff6f1e] text-5xl mb-4"></i>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/astrologer-portal/dashboard"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <i className="fas fa-arrow-left text-xl"></i>
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Account Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] px-6 py-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fas fa-user-circle"></i>
              Account
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            <Link
              href="/astrologer-portal/profile"
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#ff6f1e] to-[#ff8c42] rounded-full flex items-center justify-center">
                  <i className="fas fa-user text-white text-xl"></i>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{astrologer?.name}</p>
                  <p className="text-sm text-gray-600">{astrologer?.email}</p>
                </div>
              </div>
              <i className="fas fa-chevron-right text-gray-400"></i>
            </Link>

            <Link
              href="/astrologer-portal/profile"
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-edit text-[#ff6f1e] w-6"></i>
                <span className="text-gray-900">Edit Profile</span>
              </div>
              <i className="fas fa-chevron-right text-gray-400"></i>
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-sign-out-alt text-red-600 w-6"></i>
                <span className="text-red-600 font-medium">Logout</span>
              </div>
              <i className="fas fa-chevron-right text-red-400"></i>
            </button>
          </div>
        </div>

        {/* App Settings */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fas fa-cog"></i>
              App Settings
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            <Link
              href="/astrologer-portal/notifications"
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-bell text-blue-600 w-6"></i>
                <span className="text-gray-900">Notifications</span>
              </div>
              <i className="fas fa-chevron-right text-gray-400"></i>
            </Link>

            <button
              onClick={handleClearCache}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-broom text-blue-600 w-6"></i>
                <span className="text-gray-900">Clear Cache</span>
              </div>
              <i className="fas fa-chevron-right text-gray-400"></i>
            </button>
          </div>
        </div>

        {/* Help & Support */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fas fa-life-ring"></i>
              Help & Support
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            <a
              href="mailto:help@anytimepooja.in"
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-envelope text-green-600 w-6"></i>
                <div>
                  <p className="text-gray-900">Email Support</p>
                  <p className="text-sm text-gray-600">help@anytimepooja.in</p>
                </div>
              </div>
              <i className="fas fa-external-link-alt text-gray-400"></i>
            </a>

            <a
              href="tel:+919876543210"
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-phone text-green-600 w-6"></i>
                <div>
                  <p className="text-gray-900">Call Support</p>
                  <p className="text-sm text-gray-600">+91 98765 43210</p>
                </div>
              </div>
              <i className="fas fa-external-link-alt text-gray-400"></i>
            </a>

            <Link
              href="/astrologer-portal/help"
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-question-circle text-green-600 w-6"></i>
                <span className="text-gray-900">FAQ & Help Center</span>
              </div>
              <i className="fas fa-chevron-right text-gray-400"></i>
            </Link>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fas fa-info-circle"></i>
              About
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <i className="fas fa-mobile-alt text-purple-600 w-6"></i>
                <span className="text-gray-900">App Version</span>
              </div>
              <p className="text-sm text-gray-600 ml-9">1.0.0</p>
            </div>

            <Link
              href="/terms"
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-file-contract text-purple-600 w-6"></i>
                <span className="text-gray-900">Terms & Conditions</span>
              </div>
              <i className="fas fa-chevron-right text-gray-400"></i>
            </Link>

            <Link
              href="/privacy"
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-shield-alt text-purple-600 w-6"></i>
                <span className="text-gray-900">Privacy Policy</span>
              </div>
              <i className="fas fa-chevron-right text-gray-400"></i>
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
          <div className="bg-red-600 px-6 py-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fas fa-exclamation-triangle"></i>
              Danger Zone
            </h2>
          </div>

          <div className="p-4">
            <button
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to delete your account? This action cannot be undone."
                  )
                ) {
                  alert("Account deletion requested. Our team will contact you soon.")
                }
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
            >
              <i className="fas fa-trash-alt mr-2"></i>
              Delete Account
            </button>
            <p className="text-xs text-red-600 text-center mt-2">
              This will permanently delete your account and all associated data
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6 text-sm text-gray-500">
          <p>Made with <i className="fas fa-heart text-red-500"></i> by AstroTalk Team</p>
          <p className="mt-1">© 2025 AstroTalk. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
