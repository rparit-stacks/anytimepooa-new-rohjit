"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { vibrate } from "@/lib/vibration"
import { checkSession } from "@/lib/client-auth"
import Link from "next/link"

interface Booking {
  id: string
  astrologer_name: string
  astrologer_avatar?: string
  session_date: string
  duration_minutes: number
  amount: number
  status: string
}

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const isLoggedIn = await checkSession()
        if (!isLoggedIn) {
          router.push("/auth/login")
          return
        }

        // TODO: Replace with actual API call
        // const response = await fetch("/api/bookings")
        // if (response.ok) {
        //   const data = await response.json()
        //   setBookings(data.data || [])
        // }
        
        // Mock data for now
        setBookings([])
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white pb-24" style={{ paddingBottom: "6rem" }}>
        <Loader2 className="animate-spin text-orange-600" size={32} />
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
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
      </div>

      {/* Content */}
      <div className="p-6">
        {bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={booking.astrologer_avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80"}
                    alt={booking.astrologer_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{booking.astrologer_name}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      <i className="fas fa-calendar mr-2"></i>
                      {new Date(booking.session_date).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <i className="fas fa-clock mr-2"></i>
                      {booking.duration_minutes} minutes
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-lg font-bold text-orange-600">₹{booking.amount}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          booking.status === "confirmed"
                            ? "bg-green-100 text-green-700"
                            : booking.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <i className="fas fa-calendar-times text-gray-400 text-5xl mb-4 block"></i>
            <p className="text-gray-600 font-semibold mb-2">No bookings yet</p>
            <p className="text-gray-500 text-sm mb-6">Book your first consultation to see it here</p>
            <Link
              href="/astrologers"
              onClick={() => vibrate()}
              className="inline-block bg-orange-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-orange-700 transition-all active:scale-95"
            >
              Browse Astrologers
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

