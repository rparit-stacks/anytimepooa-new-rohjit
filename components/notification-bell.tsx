"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  reference_id: string | null
  reference_type: string | null
  is_read: boolean
  created_at: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.data || [])
        setUnreadCount(data.unread_count || 0)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: notificationId }),
      })
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Failed to mark as read:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "booking_created":
      case "booking_accepted":
      case "booking_confirmed":
        return "fa-calendar-check"
      case "booking_declined":
      case "booking_cancelled":
        return "fa-calendar-times"
      case "wallet_credit":
      case "wallet_debit":
        return "fa-wallet"
      case "session_started":
      case "session_ended":
        return "fa-video"
      default:
        return "fa-bell"
    }
  }

  const getNotificationColor = (type: string) => {
    if (type.includes("declined") || type.includes("cancelled")) {
      return "text-red-600"
    }
    if (type.includes("accepted") || type.includes("confirmed") || type.includes("credit")) {
      return "text-green-600"
    }
    if (type.includes("wallet") || type.includes("debit")) {
      return "text-orange-600"
    }
    return "text-blue-600"
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id)
    }
    setShowDropdown(false)
  }

  const getNotificationLink = (notification: Notification) => {
    if (notification.reference_type === "booking" && notification.reference_id) {
      return `/bookings`
    }
    if (notification.reference_type === "wallet") {
      return `/wallet`
    }
    return "#"
  }

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-orange-600 transition-colors"
      >
        <i className="fas fa-bell text-xl"></i>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          ></div>

          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
              <h3 className="font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-600">{unreadCount} unread</p>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-80">
              {loading ? (
                <div className="p-8 text-center">
                  <i className="fas fa-spinner fa-spin text-orange-600 text-2xl"></i>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <i className="fas fa-bell-slash text-gray-300 text-4xl mb-2"></i>
                  <p className="text-gray-500 text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={getNotificationLink(notification)}
                    onClick={() => handleNotificationClick(notification)}
                    className={`block px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? "bg-orange-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          !notification.is_read ? "bg-orange-100" : "bg-gray-100"
                        }`}
                      >
                        <i
                          className={`fas ${getNotificationIcon(notification.type)} ${getNotificationColor(
                            notification.type
                          )}`}
                        ></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold mb-1 ${
                            !notification.is_read ? "text-gray-900" : "text-gray-700"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.created_at).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="flex-shrink-0 w-2 h-2 bg-orange-600 rounded-full"></div>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <Link
                  href="/notifications"
                  onClick={() => setShowDropdown(false)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
                >
                  View All Notifications →
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

