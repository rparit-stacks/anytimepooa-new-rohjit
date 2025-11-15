"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  booking_id?: string
  withdrawal_id?: string
}

export default function AstrologerNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  useEffect(() => {
    fetchNotifications()
  }, [filter])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `/api/astrologer/notifications?filter=${filter}`
      )
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/astrologer-portal/login")
        }
        return
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/astrologer/notifications/${notificationId}/read`, {
        method: "PATCH",
      })
      fetchNotifications()
    } catch (error) {
      console.error("Failed to mark as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch("/api/astrologer/notifications/mark-all-read", {
        method: "POST",
      })
      fetchNotifications()
    } catch (error) {
      console.error("Failed to mark all as read:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_booking":
        return { icon: "fa-calendar-plus", color: "text-blue-500" }
      case "booking_cancelled":
        return { icon: "fa-calendar-times", color: "text-red-500" }
      case "payment_received":
        return { icon: "fa-coins", color: "text-green-500" }
      case "withdrawal_approved":
        return { icon: "fa-check-circle", color: "text-green-500" }
      case "withdrawal_rejected":
        return { icon: "fa-times-circle", color: "text-red-500" }
      case "review_received":
        return { icon: "fa-star", color: "text-yellow-500" }
      default:
        return { icon: "fa-bell", color: "text-gray-500" }
    }
  }

  const getRelativeTime = (date: string) => {
    const now = new Date()
    const notifDate = new Date(date)
    const diffMs = now.getTime() - notifDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return notifDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-[#ff6f1e] text-5xl mb-4"></i>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
            <h1 className="text-xl font-bold">Notifications</h1>
            {notifications.some((n) => !n.is_read) && (
              <button
                onClick={markAllAsRead}
                className="text-sm px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === "all"
                  ? "bg-white text-[#ff6f1e]"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === "unread"
                  ? "bg-white text-[#ff6f1e]"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              Unread
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <i className="fas fa-bell-slash text-gray-300 text-6xl mb-4"></i>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No Notifications
            </h3>
            <p className="text-gray-600">
              {filter === "unread"
                ? "You're all caught up!"
                : "You don't have any notifications yet"}
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const { icon, color } = getNotificationIcon(notification.type)

            return (
              <div
                key={notification.id}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
                className={`bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all cursor-pointer ${
                  !notification.is_read ? "border-l-4 border-[#ff6f1e]" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      !notification.is_read ? "bg-[#ff6f1e]/10" : "bg-gray-100"
                    }`}
                  >
                    <i className={`fas ${icon} ${color} text-xl`}></i>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4
                        className={`font-bold text-gray-900 ${
                          !notification.is_read ? "text-[#ff6f1e]" : ""
                        }`}
                      >
                        {notification.title}
                      </h4>
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-[#ff6f1e] rounded-full flex-shrink-0 mt-2"></span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {getRelativeTime(notification.created_at)}
                      </p>

                      {notification.booking_id && (
                        <Link
                          href={`/astrologer-portal/bookings`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-[#ff6f1e] hover:text-[#ff5f0e] font-medium"
                        >
                          View Booking
                          <i className="fas fa-arrow-right ml-1"></i>
                        </Link>
                      )}

                      {notification.withdrawal_id && (
                        <Link
                          href={`/astrologer-portal/wallet`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-[#ff6f1e] hover:text-[#ff5f0e] font-medium"
                        >
                          View Wallet
                          <i className="fas fa-arrow-right ml-1"></i>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
