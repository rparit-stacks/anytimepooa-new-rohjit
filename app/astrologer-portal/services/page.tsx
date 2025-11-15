"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Service {
  id: string
  service_type: string
  is_enabled: boolean
  rate_per_minute: number
  minimum_duration: number
  description: string
}

const SERVICE_TYPES = [
  {
    value: "video_call",
    label: "Video Call",
    icon: "fa-video",
    color: "from-red-500 to-pink-500",
    description: "Face-to-face video consultation",
  },
  {
    value: "voice_call",
    label: "Voice Call",
    icon: "fa-phone",
    color: "from-green-500 to-teal-500",
    description: "Audio-only phone consultation",
  },
  {
    value: "chat",
    label: "Chat",
    icon: "fa-comment",
    color: "from-blue-500 to-cyan-500",
    description: "Text-based chat consultation",
  },
  {
    value: "phone_call",
    label: "Phone Call",
    icon: "fa-phone-alt",
    color: "from-purple-500 to-indigo-500",
    description: "Traditional phone call",
  },
]

export default function ServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/astrologer/services")
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/astrologer-portal/login")
          return
        }
        throw new Error("Failed to fetch services")
      }

      const data = await response.json()
      setServices(data.services || [])
    } catch (error) {
      console.error("Failed to fetch services:", error)
      setError("Failed to load services")
    } finally {
      setLoading(false)
    }
  }

  const updateService = async (serviceType: string, updates: Partial<Service>) => {
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/astrologer/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: serviceType,
          ...updates,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to update service")
        setSaving(false)
        return
      }

      setSuccess("Service updated successfully!")
      await fetchServices()
    } catch (err) {
      setError("Failed to update service")
    } finally {
      setSaving(false)
    }
  }

  const toggleService = (serviceType: string, currentStatus: boolean) => {
    updateService(serviceType, { is_enabled: !currentStatus })
  }

  const getServiceData = (serviceType: string) => {
    return services.find((s) => s.service_type === serviceType)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center pb-24">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-[#ff6f1e] text-5xl mb-4"></i>
          <p className="text-gray-600">Loading services...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-24">
      <header className="bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/astrologer-portal/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <i className="fas fa-arrow-left text-xl"></i>
          </Link>
          <h1 className="text-xl font-bold">Services Management</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <i className="fas fa-check-circle text-green-500 mt-0.5"></i>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Services Grid */}
        <div className="space-y-4">
          {SERVICE_TYPES.map((serviceType) => {
            const service = getServiceData(serviceType.value)
            const isEnabled = service?.is_enabled || false
            const rate = service?.rate_per_minute || 0
            const minDuration = service?.minimum_duration || 5

            return (
              <div
                key={serviceType.value}
                className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:border-[#ff6f1e] transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${serviceType.color} rounded-xl flex items-center justify-center shadow-lg`}>
                      <i className={`fas ${serviceType.icon} text-white text-2xl`}></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{serviceType.label}</h3>
                      <p className="text-sm text-gray-600">{serviceType.description}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleService(serviceType.value, isEnabled)}
                    disabled={saving}
                    className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                      isEnabled ? "bg-green-500" : "bg-gray-300"
                    } ${saving ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                        isEnabled ? "translate-x-9" : "translate-x-1"
                      }`}
                    ></span>
                  </button>
                </div>

                {isEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rate (₹/min)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={rate}
                          onChange={(e) => {
                            const newRate = parseFloat(e.target.value) || 0
                            updateService(serviceType.value, { rate_per_minute: newRate })
                          }}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#ff6f1e]"
                          min="0"
                          placeholder="e.g., 50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Duration (min)
                      </label>
                      <input
                        type="number"
                        value={minDuration}
                        onChange={(e) => {
                          const newDuration = parseInt(e.target.value) || 5
                          updateService(serviceType.value, { minimum_duration: newDuration })
                        }}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#ff6f1e]"
                        min="1"
                        placeholder="e.g., 5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estimated Price
                      </label>
                      <div className="px-4 py-2 bg-gray-50 rounded-lg font-semibold text-gray-900">
                        ₹{(rate * minDuration).toFixed(0)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className={`font-medium ${isEnabled ? "text-green-600" : "text-gray-500"}`}>
                    {isEnabled ? "Service Active" : "Service Inactive"}
                  </span>
                  {isEnabled && rate > 0 && (
                    <span className="text-gray-600">
                      ₹{rate}/min • {minDuration} min minimum
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-600 mt-1"></i>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Service Management Tips</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Enable services you want to offer to clients</li>
                <li>Set competitive rates based on your expertise</li>
                <li>Minimum duration ensures quality consultations</li>
                <li>You can change rates and settings anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
        <div className="flex justify-around items-center h-20 px-2 max-w-full">
          <Link href="/astrologer-portal/dashboard" className="flex flex-col items-center gap-1 transition-all text-gray-600 hover:text-[#ff6f1e]">
            <i className="fas fa-home text-xl"></i>
            <span className="text-xs">Home</span>
          </Link>

          <Link href="/astrologer-portal/bookings" className="flex flex-col items-center gap-1 transition-all text-gray-600 hover:text-[#ff6f1e]">
            <i className="fas fa-calendar text-xl"></i>
            <span className="text-xs">Bookings</span>
          </Link>

          <Link href="/astrologer-portal/services" className="flex flex-col items-center gap-1 transition-all text-[#ff6f1e] font-semibold">
            <i className="fas fa-om text-xl animate-pulse"></i>
            <span className="text-xs">Services</span>
          </Link>

          <Link href="/astrologer-portal/wallet" className="flex flex-col items-center gap-1 transition-all text-gray-600 hover:text-[#ff6f1e]">
            <i className="fas fa-wallet text-xl"></i>
            <span className="text-xs">Wallet</span>
          </Link>

          <Link href="/astrologer-portal/profile" className="flex flex-col items-center gap-1 transition-all text-gray-600 hover:text-[#ff6f1e]">
            <i className="fas fa-user text-xl"></i>
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
