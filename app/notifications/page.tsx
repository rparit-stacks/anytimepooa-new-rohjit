"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, CheckCircle, Info, AlertCircle, X } from "lucide-react"
import { vibrate } from "@/lib/vibration"

interface Notification {
  id: string
  type: "success" | "info" | "warning" | "error"
  title: string
  message: string
  time: string
  read: boolean
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "success",
      title: "Pooja Booking Confirmed",
      message: "Your Diwali Pooja booking has been confirmed for November 12, 2024 at 10:00 AM",
      time: "2 hours ago",
      read: false,
    },
    {
      id: "2",
      type: "info",
      title: "New Astrologer Available",
      message: "Dr. Rajesh Kumar is now available for consultations. Book your session now!",
      time: "5 hours ago",
      read: false,
    },
    {
      id: "3",
      type: "warning",
      title: "Wallet Balance Low",
      message: "Your wallet balance is running low. Add money to continue using services.",
      time: "1 day ago",
      read: true,
    },
    {
      id: "4",
      type: "success",
      title: "Horoscope Generated",
      message: "Your personalized horoscope for November 2024 is ready. View it now!",
      time: "2 days ago",
      read: true,
    },
    {
      id: "5",
      type: "info",
      title: "Special Offer",
      message: "Get 20% off on all Pooja services this Diwali. Limited time offer!",
      time: "3 days ago",
      read: true,
    },
  ])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="text-green-600" size={20} />
      case "info":
        return <Info className="text-blue-600" size={20} />
      case "warning":
        return <AlertCircle className="text-yellow-600" size={20} />
      case "error":
        return <AlertCircle className="text-red-600" size={20} />
      default:
        return <Bell className="text-gray-600" size={20} />
    }
  }

  const getNotificationBg = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200"
      case "info":
        return "bg-blue-50 border-blue-200"
      case "warning":
        return "bg-yellow-50 border-yellow-200"
      case "error":
        return "bg-red-50 border-red-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const markAsRead = (id: string) => {
    vibrate()
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    )
  }

  const deleteNotification = (id: string) => {
    vibrate()
    setNotifications((prev) => prev.filter((notif) => notif.id !== id))
  }

  const markAllAsRead = () => {
    vibrate()
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                vibrate()
                router.back()
              }}
              className="text-gray-600 active:scale-95 transition-transform"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-2">
              <Bell className="text-orange-600" size={24} />
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-orange-600 font-semibold active:scale-95 transition-transform"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell className="text-gray-400 mb-4" size={64} />
            <p className="text-gray-600 text-lg font-semibold">No notifications</p>
            <p className="text-gray-500 text-sm mt-2">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-xl p-4 border-2 shadow-sm transition-all ${
                notification.read ? "opacity-60" : getNotificationBg(notification.type)
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3
                        className={`font-semibold text-gray-900 ${
                          !notification.read ? "font-bold" : ""
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                      <p className="text-gray-400 text-xs mt-2">{notification.time}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-orange-600 font-semibold active:scale-95 transition-transform"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-gray-400 hover:text-red-600 active:scale-95 transition-colors p-1"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

