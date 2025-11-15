"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Booking {
  id: string
  booking_reference: string
  user_id: string
  user_name: string
  user_avatar?: string
  session_date: string
  session_type: string
  duration_minutes: number
  amount: number
  status: string
  astrologer_status: string
  created_at: string
  session_link: string | null
  session_status: string | null
  scheduled_start_time: string
  link_valid_until: string
}

export default function AstrologerBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "upcoming" | "past" | "pending">("all")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  // Filter bookings based on selected filter
  useEffect(() => {
    const now = new Date()
    
    let filtered = bookings
    if (filter === "pending") {
      filtered = bookings.filter(b => b.astrologer_status === "pending" || b.status === "pending")
    } else if (filter === "upcoming") {
      // Upcoming: confirmed and not expired
      filtered = bookings.filter(b => {
        const validUntil = b.link_valid_until ? new Date(b.link_valid_until) : null
        return b.status === "confirmed" && (!validUntil || validUntil > now)
      })
    } else if (filter === "past") {
      // Past: completed, cancelled, or expired
      filtered = bookings.filter(b => {
        const validUntil = b.link_valid_until ? new Date(b.link_valid_until) : null
        return b.status === "completed" || b.status === "cancelled" || (validUntil && validUntil < now)
      })
    }
    
    setFilteredBookings(filtered)
  }, [bookings, filter])

  // Helper function to check if Join button should be visible (5 min before, 10 min after)
  const canJoinSession = (booking: Booking) => {
    if (!booking.scheduled_start_time || booking.status !== "confirmed") return false
    
    const now = new Date()
    const scheduledTime = new Date(booking.scheduled_start_time)
    
    // 5 minutes before scheduled time
    const fiveMinutesBefore = new Date(scheduledTime.getTime() - 5 * 60 * 1000)
    // 10 minutes after scheduled time
    const tenMinutesAfter = new Date(scheduledTime.getTime() + 10 * 60 * 1000)
    
    // Button visible from 5 min before to 10 min after
    return now >= fiveMinutesBefore && now <= tenMinutesAfter
  }

  // Helper function to check if booking is expired (10+ min after scheduled time)
  const isBookingExpired = (booking: Booking) => {
    if (!booking.scheduled_start_time) return false
    if (booking.status === "completed" || booking.status === "cancelled") return false
    
    const now = new Date()
    const scheduledTime = new Date(booking.scheduled_start_time)
    const tenMinutesAfter = new Date(scheduledTime.getTime() + 10 * 60 * 1000)
    
    // Expired if current time is more than 10 minutes after scheduled time
    return now > tenMinutesAfter
  }

  // Helper function to get time until join button becomes active
  const getTimeUntilActive = (booking: Booking) => {
    if (!booking.scheduled_start_time) return null
    
    const now = new Date()
    const scheduledTime = new Date(booking.scheduled_start_time)
    const fiveMinutesBefore = new Date(scheduledTime.getTime() - 5 * 60 * 1000)
    
    if (now >= fiveMinutesBefore) return null
    
    const diffMs = fiveMinutesBefore.getTime() - now.getTime()
    const diffMins = Math.ceil(diffMs / 60000)
    
    if (diffMins > 60) {
      const hours = Math.floor(diffMins / 60)
      const mins = diffMins % 60
      return `${hours}h ${mins}m`
    }
    return `${diffMins}m`
  }

  const fetchBookings = async () => {
    try {
      const response = await fetch(`/api/astrologer-portal/bookings`)
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/astrologer-portal/login")
        }
        return
      }

      const data = await response.json()
      console.log("[Astrologer Bookings] Received:", data.data?.length || 0, "bookings")
      
      // Sort bookings by created_at DESC (latest first)
      const sortedBookings = (data.data || []).sort((a: Booking, b: Booking) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      
      setBookings(sortedBookings)
    } catch (error) {
      console.error("Failed to fetch bookings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (bookingId: string) => {
    setActionLoading(bookingId)

    try {
      const response = await fetch(`/api/astrologer/bookings/${bookingId}/accept`, {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh bookings
        fetchBookings()
      } else {
        alert(data.error || "Failed to accept booking")
      }
    } catch (error) {
      alert("Failed to accept booking")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDecline = async (bookingId: string) => {
    const confirmed = confirm(
      "Are you sure you want to decline this booking? The user will be refunded and a 1% penalty will be applied to your wallet."
    )

    if (!confirmed) return

    setActionLoading(bookingId)

    try {
      const response = await fetch(`/api/astrologer/bookings/${bookingId}/decline`, {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        alert("Booking declined. User refunded and 1% penalty applied.")
        fetchBookings()
      } else {
        alert(data.error || "Failed to decline booking")
      }
    } catch (error) {
      alert("Failed to decline booking")
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700"
      case "confirmed":
      case "accepted":
        return "bg-blue-100 text-blue-700"
      case "completed":
        return "bg-green-100 text-green-700"
      case "declined":
      case "cancelled":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "fa-clock"
      case "confirmed":
      case "accepted":
        return "fa-check"
      case "completed":
        return "fa-check-circle"
      case "declined":
      case "cancelled":
        return "fa-times-circle"
      default:
        return "fa-circle"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center pb-24">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-[#ff6f1e] text-5xl mb-4"></i>
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/astrologer-portal/dashboard"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <i className="fas fa-arrow-left text-xl"></i>
            </Link>
            <h1 className="text-xl font-bold">My Bookings</h1>
            <div className="w-10"></div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["all", "pending", "upcoming", "past"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  filter === f
                    ? "bg-white text-[#ff6f1e]"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <i className="fas fa-calendar-times text-gray-300 text-6xl mb-4"></i>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Bookings Found</h3>
            <p className="text-gray-600">
              {filter === "pending"
                ? "You don't have any pending bookings"
                : filter === "upcoming"
                ? "You don't have any upcoming bookings"
                : filter === "past"
                ? "You don't have any past bookings"
                : "You don't have any bookings yet"}
            </p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {booking.user_avatar ? (
                      <img
                        src={booking.user_avatar}
                        alt={booking.user_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-[#ff6f1e] to-[#ff8c42] rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {booking.user_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900">{booking.user_name}</h3>
                      <p className="text-xs text-gray-500">{booking.booking_reference}</p>
                    </div>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    booking.status
                  )}`}
                >
                  <i className={`fas ${getStatusIcon(booking.status)} mr-1`}></i>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
              </div>

              {/* Booking Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 text-sm">
                  <i className={`fas ${
                    booking.session_type === 'video' ? 'fa-video' :
                    booking.session_type === 'voice' ? 'fa-phone' : 'fa-comments'
                  } text-[#ff6f1e] w-5`}></i>
                  <span className="font-medium text-gray-700">Type:</span>
                  <span className="text-gray-900">{booking.session_type.charAt(0).toUpperCase() + booking.session_type.slice(1)} Session</span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <i className="fas fa-clock text-[#ff6f1e] w-5"></i>
                  <span className="font-medium text-gray-700">Duration:</span>
                  <span className="text-gray-900">{booking.duration_minutes} minutes</span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <i className="fas fa-rupee-sign text-[#ff6f1e] w-5"></i>
                  <span className="font-medium text-gray-700">Amount:</span>
                  <span className="text-gray-900 font-bold">₹{booking.amount.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <i className="fas fa-calendar text-[#ff6f1e] w-5"></i>
                  <span className="font-medium text-gray-700">Scheduled:</span>
                  <span className="text-gray-900">
                    {new Date(booking.session_date).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {booking.status === "pending" && (
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleAccept(booking.id)}
                    disabled={actionLoading === booking.id}
                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg disabled:opacity-50"
                  >
                    {actionLoading === booking.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fas fa-spinner fa-spin"></i>
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fas fa-check"></i>
                        Accept
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleDecline(booking.id)}
                    disabled={actionLoading === booking.id}
                    className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg disabled:opacity-50"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-times"></i>
                      Decline
                    </span>
                  </button>
                </div>
              )}

              {/* Join Session Button - Time-based visibility (5 min before, 10 min after) */}
              {booking.session_link && booking.status === "confirmed" && !isBookingExpired(booking) && (
                <div className="pt-4 border-t border-gray-100">
                  {canJoinSession(booking) ? (
                    <Link
                      href={booking.session_link}
                      className="block w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg text-center animate-pulse"
                    >
                      <i className="fas fa-video mr-2"></i>
                      Join Session Now
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="block w-full py-3 bg-gray-300 text-gray-600 font-semibold rounded-xl cursor-not-allowed opacity-60 text-center"
                      title={`Available in ${getTimeUntilActive(booking)}`}
                    >
                      <i className="fas fa-clock mr-2"></i>
                      {getTimeUntilActive(booking) ? `Available in ${getTimeUntilActive(booking)}` : 'Not Available Yet'}
                    </button>
                  )}
                </div>
              )}
              
              {/* Show expired status */}
              {booking.status === "confirmed" && isBookingExpired(booking) && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="block w-full py-3 bg-red-100 text-red-700 font-semibold rounded-xl text-center">
                    <i className="fas fa-times-circle mr-2"></i>
                    Session Expired (Auto-cancelling...)
                  </div>
                </div>
              )}
              
              {/* Details Button for completed sessions */}
              {booking.status === "completed" && (
                <div className="pt-4 border-t border-gray-100">
                  <button
                    className="block w-full py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg text-center"
                  >
                    <i className="fas fa-history mr-2"></i>
                    View Session Details
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
        <div className="flex justify-around items-center h-20 px-2 max-w-full">
          <Link
            href="/astrologer-portal/dashboard"
            className="flex flex-col items-center gap-1 transition-all text-gray-600 hover:text-[#ff6f1e]"
          >
            <i className="fas fa-home text-xl"></i>
            <span className="text-xs">Home</span>
          </Link>

          <Link
            href="/astrologer-portal/bookings"
            className="flex flex-col items-center gap-1 transition-all text-[#ff6f1e] font-semibold"
          >
            <i className="fas fa-calendar text-xl animate-pulse"></i>
            <span className="text-xs">Bookings</span>
          </Link>

          <Link
            href="/astrologer-portal/services"
            className="flex flex-col items-center gap-1 transition-all text-gray-600 hover:text-[#ff6f1e]"
          >
            <i className="fas fa-om text-xl"></i>
            <span className="text-xs">Services</span>
          </Link>

          <Link
            href="/astrologer-portal/wallet"
            className="flex flex-col items-center gap-1 transition-all text-gray-600 hover:text-[#ff6f1e]"
          >
            <i className="fas fa-wallet text-xl"></i>
            <span className="text-xs">Wallet</span>
          </Link>

          <Link
            href="/astrologer-portal/profile"
            className="flex flex-col items-center gap-1 transition-all text-gray-600 hover:text-[#ff6f1e]"
          >
            <i className="fas fa-user text-xl"></i>
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
