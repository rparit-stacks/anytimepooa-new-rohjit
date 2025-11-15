"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Loader2, Calendar, Clock, MapPin } from "lucide-react"
import { vibrate } from "@/lib/vibration"
import { showToast } from "@/components/toast"
import { checkSession } from "@/lib/client-auth"

interface BookingData {
  service: {
    id: string
    name: string
    base_price: number
  }
  astrologer: {
    id: string
    name: string
    avatar_url?: string
    rating: number
    location: string
    price_per_session: number
    distance_km?: number
  }
  total_amount: number
}

export default function PoojaBookingPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [formData, setFormData] = useState({
    booking_date: "",
    booking_time: "",
    address: "",
    city: "",
    special_instructions: "",
  })
  const [showAddressForm, setShowAddressForm] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const isLoggedIn = await checkSession()
        if (!isLoggedIn) {
          router.push("/auth/login")
          return
        }

        // Fetch user profile
        const profileResponse = await fetch("/api/user/profile")
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setUserProfile(profileData.data)
          
          // Pre-fill address if available
          if (profileData.data?.location || profileData.data?.address) {
            setFormData((prev) => ({
              ...prev,
              address: profileData.data.location || profileData.data.address || "",
              city: profileData.data.city || "",
            }))
          } else {
            setShowAddressForm(true)
          }
        }

        // Fetch service and astrologer details
        const [serviceRes, astroRes] = await Promise.all([
          fetch("/api/pooja/services"),
          fetch("/api/astrologers"),
        ])

        if (serviceRes.ok && astroRes.ok) {
          const serviceData = await serviceRes.json()
          const astroData = await astroRes.json()
          
          const service = serviceData.data?.find((s: any) => s.id === params.serviceId)
          const astrologer = astroData.data?.find((a: any) => a.id === params.astrologerId)

          if (service && astrologer) {
            setBookingData({
              service,
              astrologer,
              total_amount: parseFloat(service.base_price) + parseFloat(astrologer.price_per_session || 0),
            })
          }
        }
      } finally {
        setLoading(false)
      }
    }

    if (params.serviceId && params.astrologerId) {
      fetchData()
    }
  }, [params.serviceId, params.astrologerId, router])

  const handleBook = async () => {
    if (!formData.address || !formData.city) {
      showToast("Please provide your address", "error")
      setShowAddressForm(true)
      return
    }

    if (!formData.booking_date || !formData.booking_time) {
      showToast("Please select booking date and time", "error")
      return
    }

    vibrate()

    try {
      // Check wallet balance first
      const walletResponse = await fetch("/api/wallet/balance")
      if (!walletResponse.ok) {
        showToast("Failed to check wallet balance", "error")
        return
      }

      const walletData = await walletResponse.json()
      const currentBalance = walletData.balance || 0

      if (currentBalance < bookingData.total_amount) {
        const shortfall = bookingData.total_amount - currentBalance
        if (confirm(`Insufficient wallet balance!\n\nRequired: ₹${bookingData.total_amount}\nAvailable: ₹${currentBalance}\nShortfall: ₹${shortfall.toFixed(2)}\n\nWould you like to recharge your wallet?`)) {
          router.push("/wallet/add-money")
        }
        return
      }

      // Create pooja booking
      const bookingResponse = await fetch("/api/pooja/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pooja_service_id: params.serviceId,
          astrologer_id: params.astrologerId,
          booking_date: formData.booking_date,
          booking_time: formData.booking_time,
          address: formData.address,
          city: formData.city,
          special_instructions: formData.special_instructions,
        }),
      })

      const result = await bookingResponse.json()

      if (bookingResponse.ok && result.success) {
        showToast("Booking confirmed successfully!", "success")
        setTimeout(() => {
          router.push("/bookings")
        }, 1500)
      } else if (result.error === "INSUFFICIENT_BALANCE") {
        if (confirm(`Insufficient wallet balance!\n\nRequired: ₹${result.data.required_amount}\nAvailable: ₹${result.data.current_balance}\n\nWould you like to recharge your wallet?`)) {
          router.push("/wallet/add-money")
        }
      } else {
        showToast(result.message || result.error || "Booking failed", "error")
      }
    } catch (error: any) {
      console.error("[Pooja Booking] Error:", error)
      showToast(`Booking failed: ${error.message}`, "error")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white pb-24" style={{ paddingBottom: "6rem" }}>
        <Loader2 className="animate-spin text-orange-600" size={32} />
      </div>
    )
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white pb-24" style={{ paddingBottom: "6rem" }}>
        <p className="text-gray-600">Booking details not found</p>
      </div>
    )
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Confirm Booking</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Booking Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
          <h3 className="text-xl font-bold mb-4">Booking Summary</h3>

          {/* Service */}
          <div className="border-b border-gray-200 pb-4">
            <p className="text-sm text-gray-500 mb-1">Pooja Service</p>
            <p className="font-semibold text-lg">{bookingData.service.name}</p>
            <p className="text-sm text-gray-600">₹{bookingData.service.base_price}</p>
          </div>

          {/* Astrologer */}
          <div className="border-b border-gray-200 pb-4">
            <p className="text-sm text-gray-500 mb-2">Astrologer</p>
            <div className="flex items-center gap-3">
              <img
                src={bookingData.astrologer.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80"}
                alt={bookingData.astrologer.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold">{bookingData.astrologer.name}</p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin size={12} />
                  {bookingData.astrologer.location}
                  {bookingData.astrologer.distance_km && (
                    <span className="text-orange-600 ml-2">{bookingData.astrologer.distance_km} km away</span>
                  )}
                </p>
                <p className="text-sm text-gray-600">Fee: ₹{bookingData.astrologer.price_per_session}</p>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold">Total Amount</p>
              <p className="text-2xl font-bold text-orange-600">₹{bookingData.total_amount}</p>
            </div>
          </div>
        </div>

        {/* Booking Details Form */}
        <div className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
          <h3 className="text-xl font-bold mb-4">Booking Details</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={formData.booking_date}
                onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Clock size={16} className="inline mr-1" />
                Time
              </label>
              <input
                type="time"
                value={formData.booking_time}
                onChange={(e) => setFormData({ ...formData, booking_time: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
                required
              />
            </div>
          </div>

          {/* Address */}
          {!showAddressForm && formData.address ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <MapPin size={16} className="inline mr-1" />
                Address
              </label>
              <div className="border-2 border-gray-300 rounded-lg px-4 py-3 bg-gray-50">
                <p className="text-gray-900">{formData.address}</p>
                <p className="text-sm text-gray-600">{formData.city}</p>
              </div>
              <button
                onClick={() => {
                  vibrate()
                  setShowAddressForm(true)
                }}
                className="mt-2 text-orange-600 text-sm font-semibold hover:text-orange-700"
              >
                Change Address
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter your complete address"
                  rows={3}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Enter your city"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Special Instructions (Optional)</label>
            <textarea
              value={formData.special_instructions}
              onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
              placeholder="Any special requirements or instructions"
              rows={3}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
            />
          </div>
        </div>

        {/* Book Button */}
        <button
          onClick={handleBook}
          className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
        >
          <i className="fas fa-calendar-check"></i>
          Confirm Booking
        </button>
      </div>
    </div>
  )
}


