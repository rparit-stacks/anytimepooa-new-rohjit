"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AstrologerNotificationBell from "@/components/astrologer-notification-bell"
import Link from "next/link"

interface Stats {
  wallet: {
    balance: number
    total_earnings: number
    pending_amount: number
    available_balance: number
  }
  bookings: {
    total: number
    pending: number
    completed: number
    today: number
  }
  services: {
    pooja_items: number
  }
  earnings: {
    this_month: number
  }
  notifications: {
    unread: number
  }
  recent_transactions: any[]
}

export default function AstrologerDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [astrologer, setAstrologer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch astrologer profile
      const profileRes = await fetch("/api/astrologer/auth/me")
      if (!profileRes.ok) {
        router.push("/astrologer-portal/login")
        return
      }

      const profileData = await profileRes.json()
      setAstrologer(profileData.astrologer)

      // Fetch dashboard stats
      const statsRes = await fetch("/api/astrologer/dashboard/stats")
      const statsData = await statsRes.json()

      if (statsData.success) {
        setStats(statsData.stats)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch("/api/astrologer/auth/logout", { method: "POST" })
    router.push("/astrologer-portal/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-[#ff6f1e] text-5xl mb-4"></i>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#ff6f1e] to-[#ff8c42] rounded-full flex items-center justify-center shadow-lg">
              <i className="fas fa-star text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Astrologer Portal</h1>
              <p className="text-sm text-gray-600">Welcome, {astrologer?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AstrologerNotificationBell />
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <i className="fas fa-sign-out-alt text-xl"></i>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Wallet Card */}
        <div className="bg-gradient-to-br from-[#ff6f1e] to-[#ff8c42] rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm mb-1">Available Balance</p>
              <h2 className="text-4xl font-bold">
                ₹{stats?.wallet.available_balance.toLocaleString() || 0}
              </h2>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <i className="fas fa-wallet text-3xl"></i>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <p className="text-white/70 text-xs mb-1">Total Earnings</p>
              <p className="text-xl font-bold">₹{stats?.wallet.total_earnings.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <p className="text-white/70 text-xs mb-1">Pending</p>
              <p className="text-xl font-bold">₹{stats?.wallet.pending_amount.toLocaleString() || 0}</p>
            </div>
          </div>

          <Link
            href="/astrologer-portal/wallet"
            className="block mt-4 py-3 bg-white text-[#ff6f1e] text-center font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            <i className="fas fa-arrow-right mr-2"></i>
            Withdraw Funds
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <i className="fas fa-calendar-check text-blue-500 text-2xl"></i>
              <span className="text-2xl font-bold text-gray-900">{stats?.bookings.pending || 0}</span>
            </div>
            <p className="text-sm text-gray-600">Pending Bookings</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <i className="fas fa-check-circle text-green-500 text-2xl"></i>
              <span className="text-2xl font-bold text-gray-900">{stats?.bookings.completed || 0}</span>
            </div>
            <p className="text-sm text-gray-600">Completed</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <i className="fas fa-calendar-day text-purple-500 text-2xl"></i>
              <span className="text-2xl font-bold text-gray-900">{stats?.bookings.today || 0}</span>
            </div>
            <p className="text-sm text-gray-600">Today's Sessions</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-[#ff6f1e]">
            <div className="flex items-center justify-between mb-2">
              <i className="fas fa-rupee-sign text-[#ff6f1e] text-2xl"></i>
              <span className="text-2xl font-bold text-gray-900">
                {stats?.earnings.this_month.toLocaleString() || 0}
              </span>
            </div>
            <p className="text-sm text-gray-600">This Month</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fas fa-bolt text-[#ff6f1e]"></i>
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/astrologer-portal/bookings"
              className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:shadow-md transition-all text-center group"
            >
              <i className="fas fa-calendar text-blue-600 text-3xl mb-2 group-hover:scale-110 transition-transform"></i>
              <p className="text-sm font-medium text-blue-900">Bookings</p>
            </Link>

            <Link
              href="/astrologer-portal/services"
              className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:shadow-md transition-all text-center group"
            >
              <i className="fas fa-om text-purple-600 text-3xl mb-2 group-hover:scale-110 transition-transform"></i>
              <p className="text-sm font-medium text-purple-900">Services</p>
            </Link>

            <Link
              href="/astrologer-portal/profile"
              className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl hover:shadow-md transition-all text-center group"
            >
              <i className="fas fa-user text-green-600 text-3xl mb-2 group-hover:scale-110 transition-transform"></i>
              <p className="text-sm font-medium text-green-900">Profile</p>
            </Link>

            <Link
              href="/astrologer-portal/wallet"
              className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl hover:shadow-md transition-all text-center group"
            >
              <i className="fas fa-wallet text-[#ff6f1e] text-3xl mb-2 group-hover:scale-110 transition-transform"></i>
              <p className="text-sm font-medium text-orange-900">Wallet</p>
            </Link>
          </div>
        </div>

        {/* Recent Transactions */}
        {stats && stats.recent_transactions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <i className="fas fa-history text-[#ff6f1e]"></i>
                Recent Transactions
              </h3>
              <Link
                href="/astrologer-portal/wallet/transactions"
                className="text-sm text-[#ff6f1e] hover:text-[#ff5f0e] font-medium"
              >
                View All
                <i className="fas fa-arrow-right ml-1"></i>
              </Link>
            </div>

            <div className="space-y-3">
              {stats.recent_transactions.slice(0, 5).map((transaction: any) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === "credit"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      <i
                        className={`fas ${
                          transaction.type === "credit" ? "fa-plus" : "fa-minus"
                        }`}
                      ></i>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        transaction.type === "credit"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.type === "credit" ? "+" : "-"}₹
                      {transaction.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
        <div className="flex justify-around items-center h-20 px-2 max-w-full">
          <Link
            href="/astrologer-portal/dashboard"
            className="flex flex-col items-center gap-1 transition-all text-[#ff6f1e] font-semibold"
          >
            <i className="fas fa-home text-xl animate-pulse"></i>
            <span className="text-xs">Home</span>
          </Link>

          <Link
            href="/astrologer-portal/bookings"
            className="flex flex-col items-center gap-1 transition-all text-gray-600 hover:text-[#ff6f1e]"
          >
            <i className="fas fa-calendar text-xl"></i>
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
