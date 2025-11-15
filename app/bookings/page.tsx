"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { vibrate } from "@/lib/vibration"
import { checkSession } from "@/lib/client-auth"
import Link from "next/link"
import { ChatHistory } from "@/components/ChatHistory"
import { RecordingPlayer } from "@/components/RecordingPlayer"

interface Booking {
  id: string
  booking_reference: string
  astrologer_id: string
  astrologer_name: string
  astrologer_avatar?: string
  session_date: string
  session_type: string
  duration_minutes: number
  amount: number
  status: string
  session_link: string | null
  session_status: string | null
  scheduled_start_time: string
  link_valid_until: string
  created_at: string
}

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all")
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null)
  const [cancellingBooking, setCancellingBooking] = useState<string | null>(null)

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const isLoggedIn = await checkSession()
        if (!isLoggedIn) {
          router.push("/auth/login")
          return
        }

        const response = await fetch("/api/bookings")
        if (response.ok) {
          const data = await response.json()
          // Sort bookings by created_at DESC (latest first)
          const sortedBookings = (data.data || []).sort((a: Booking, b: Booking) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
          setBookings(sortedBookings)
        } else {
          console.error("Failed to fetch bookings")
        }
      } catch (error) {
        console.error("Error fetching bookings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [router])

  // Filter bookings based on selected filter
  useEffect(() => {
    const now = new Date()
    
    let filtered = bookings
    if (filter === "upcoming") {
      // Upcoming: scheduled_start_time is in future OR status is pending/confirmed
      filtered = bookings.filter(b => {
        const scheduledTime = new Date(b.scheduled_start_time || b.session_date)
        return scheduledTime > now || b.status === "pending" || b.status === "confirmed"
      })
    } else if (filter === "past") {
      // Past: completed, cancelled, or expired
      filtered = bookings.filter(b => {
        const scheduledTime = new Date(b.scheduled_start_time || b.session_date)
        const validUntil = b.link_valid_until ? new Date(b.link_valid_until) : null
        return b.status === "completed" || b.status === "cancelled" || (validUntil && validUntil < now)
      })
    }
    
    setFilteredBookings(filtered)
  }, [bookings, filter])

  // Helper function to check if session link is still valid
  const isSessionLinkValid = (booking: Booking) => {
    if (!booking.link_valid_until) return false
    const now = new Date()
    const validUntil = new Date(booking.link_valid_until)
    return validUntil > now
  }

  // Helper function to check if booking is expired (time passed and not joined)
  const isBookingExpired = (booking: Booking) => {
    if (!booking.link_valid_until) return false
    const now = new Date()
    const validUntil = new Date(booking.link_valid_until)
    return validUntil < now && booking.status !== "completed" && booking.status !== "cancelled"
  }

  // Helper function to check if booking can be cancelled
  const canCancelBooking = (booking: Booking) => {
    return booking.status === "pending" || booking.status === "confirmed" || isBookingExpired(booking)
  }

  // Cancel booking function
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking? The amount will be refunded to your wallet.")) {
      return
    }

    setCancellingBooking(bookingId)
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "User cancelled booking",
        }),
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Booking cancelled successfully! ₹${result.refund_amount} refunded to your wallet.`)
        
        // Refresh bookings
        const bookingsResponse = await fetch("/api/bookings")
        if (bookingsResponse.ok) {
          const data = await bookingsResponse.json()
          const sortedBookings = (data.data || []).sort((a: Booking, b: Booking) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
          setBookings(sortedBookings)
        }
      } else {
        const error = await response.json()
        alert(`Failed to cancel booking: ${error.error}`)
      }
    } catch (error) {
      console.error("Error cancelling booking:", error)
      alert("Failed to cancel booking. Please try again.")
    } finally {
      setCancellingBooking(null)
    }
  }

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
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center gap-3 p-4">
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
        
        {/* Filter Tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {(["all", "upcoming", "past"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                vibrate()
                setFilter(f)
              }}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                filter === f
                  ? "bg-orange-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
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
                    <p className="text-sm text-gray-600 mb-2">
                      <i className={`fas ${
                        booking.session_type === 'video' ? 'fa-video' :
                        booking.session_type === 'voice' ? 'fa-phone' : 'fa-comments'
                      } mr-2`}></i>
                      {booking.session_type.charAt(0).toUpperCase() + booking.session_type.slice(1)} Session
                    </p>
                    <div className="flex items-center justify-between mt-3 gap-2">
                      <span className="text-lg font-bold text-orange-600">₹{booking.amount}</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            booking.status === "confirmed"
                              ? "bg-green-100 text-green-700"
                              : booking.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : booking.status === "cancelled"
                                  ? "bg-red-100 text-red-700"
                                  : isBookingExpired(booking)
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {isBookingExpired(booking) ? "Expired" : booking.status}
                        </span>
                        {/* Show Join button only if link is valid and not expired */}
                        {booking.session_link && booking.status === "confirmed" && isSessionLinkValid(booking) && (
                          <Link
                            href={booking.session_link}
                            onClick={() => vibrate()}
                            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white text-xs font-semibold rounded-full transition-all active:scale-95 shadow-md"
                          >
                            <i className="fas fa-video mr-1"></i>
                            Join
                          </Link>
                        )}
                        {/* Show Cancel button for pending/confirmed/expired bookings */}
                        {canCancelBooking(booking) && (
                          <button
                            onClick={() => {
                              vibrate()
                              handleCancelBooking(booking.id)
                            }}
                            disabled={cancellingBooking === booking.id}
                            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-semibold rounded-full transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {cancellingBooking === booking.id ? (
                              <>
                                <Loader2 className="inline-block w-3 h-3 mr-1 animate-spin" />
                                Cancelling...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-times mr-1"></i>
                                Cancel
                              </>
                            )}
                          </button>
                        )}
                        {/* Show Details button for completed sessions */}
                        {booking.status === "completed" && (
                          <button
                            onClick={() => {
                              vibrate()
                              setExpandedBooking(expandedBooking === booking.id ? null : booking.id)
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white text-xs font-semibold rounded-full transition-all active:scale-95 shadow-md"
                          >
                            <i className="fas fa-history mr-1"></i>
                            {expandedBooking === booking.id ? 'Hide' : 'Details'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Expanded Details for Completed Sessions */}
                {expandedBooking === booking.id && booking.status === "completed" && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                    {/* Chat History */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <ChatHistory bookingId={booking.id} />
                    </div>
                    
                    {/* Recording (if available) */}
                    {(booking.session_type === 'voice' || booking.session_type === 'video') && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <RecordingPlayer bookingId={booking.id} />
                      </div>
                    )}
                  </div>
                )}
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

