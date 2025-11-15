"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface WalletData {
  balance: number
  total_earnings: number
  pending_amount: number
  frozen_amount: number
  available_balance: number
  total_withdrawn: number
}

interface Transaction {
  id: string
  type: "credit" | "debit"
  amount: number
  description: string
  status: string
  created_at: string
}

interface Withdrawal {
  id: string
  amount: number
  status: string
  bank_details: any
  created_at: string
  processed_at?: string
  remarks?: string
}

export default function AstrologerWalletPage() {
  const router = useRouter()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"overview" | "transactions" | "withdrawals">(
    "overview"
  )

  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [bankDetails, setBankDetails] = useState({
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    bank_name: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [walletRes, transactionsRes, withdrawalsRes] = await Promise.all([
        fetch("/api/astrologer/wallet"),
        fetch("/api/astrologer/wallet/transactions"),
        fetch("/api/astrologer/wallet/withdrawals"),
      ])

      if (!walletRes.ok) {
        router.push("/astrologer-portal/login")
        return
      }

      const walletData = await walletRes.json()
      const transactionsData = await transactionsRes.json()
      const withdrawalsData = await withdrawalsRes.json()

      setWallet(walletData.wallet)
      setTransactions(transactionsData.transactions || [])
      setWithdrawals(withdrawalsData.withdrawals || [])
    } catch (error) {
      console.error("Failed to fetch wallet data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()

    const amount = parseFloat(withdrawAmount)

    if (amount <= 0) {
      alert("Please enter a valid amount")
      return
    }

    if (!wallet || amount > wallet.available_balance) {
      alert("Insufficient balance")
      return
    }

    if (amount < 500) {
      alert("Minimum withdrawal amount is ₹500")
      return
    }

    try {
      const response = await fetch("/api/astrologer/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          bank_details: bankDetails,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert("Withdrawal request submitted successfully!")
        setShowWithdrawModal(false)
        setWithdrawAmount("")
        setBankDetails({
          account_holder_name: "",
          account_number: "",
          ifsc_code: "",
          bank_name: "",
        })
        fetchData()
      } else {
        alert(data.error || "Failed to process withdrawal")
      }
    } catch (error) {
      alert("Failed to process withdrawal")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center pb-24">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-[#ff6f1e] text-5xl mb-4"></i>
          <p className="text-gray-600">Loading wallet...</p>
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
            <h1 className="text-xl font-bold">My Wallet</h1>
            <div className="w-10"></div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["overview", "transactions", "withdrawals"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t as any)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  tab === t
                    ? "bg-white text-[#ff6f1e]"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {tab === "overview" && wallet && (
          <>
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-[#ff6f1e] to-[#ff8c42] rounded-2xl shadow-xl p-6 text-white">
              <p className="text-white/80 text-sm mb-1">Available Balance</p>
              <h2 className="text-4xl font-bold mb-6">
                ₹{wallet.available_balance.toLocaleString()}
              </h2>

              <button
                onClick={() => setShowWithdrawModal(true)}
                disabled={wallet.available_balance < 500}
                className="w-full py-3 bg-white text-[#ff6f1e] font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-arrow-down mr-2"></i>
                Withdraw Funds
              </button>

              {wallet.available_balance < 500 && (
                <p className="text-xs text-white/70 text-center mt-2">
                  Minimum withdrawal amount is ₹500
                </p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
                <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{wallet.total_earnings.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-yellow-500">
                <p className="text-sm text-gray-600 mb-1">
                  <i className="fas fa-clock mr-1"></i>
                  Pending Amount
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{wallet.pending_amount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  From new bookings
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-orange-500">
                <p className="text-sm text-gray-600 mb-1">
                  <i className="fas fa-lock mr-1"></i>
                  Frozen Amount
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{(wallet.frozen_amount || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Session in progress
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
                <p className="text-sm text-gray-600 mb-1">Total Withdrawn</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{wallet.total_withdrawn.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                <i className="fas fa-info-circle text-blue-600 mr-2"></i>
                Payment Flow
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">1.</span>
                  <p><strong>Pending:</strong> When user books, amount shows in pending (not available yet)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold">2.</span>
                  <p><strong>Frozen:</strong> When both join session, amount moves to frozen (locked during session)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">3.</span>
                  <p><strong>Available:</strong> After session completes, amount released to your balance (can withdraw)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">✗</span>
                  <p><strong>Cancelled:</strong> If booking cancelled, amount refunded to user (removed from pending)</p>
                </div>
              </div>
            </div>

            {/* Commission Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Commission Structure</p>
                  <p>
                    You receive <strong>97%</strong> of each booking, while 3% goes to
                    platform maintenance.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "transactions" && (
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <i className="fas fa-file-invoice text-gray-300 text-6xl mb-4"></i>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No Transactions Yet
                </h3>
                <p className="text-gray-600">Your transaction history will appear here</p>
              </div>
            ) : (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between">
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
                        <p className="font-medium text-gray-900">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.created_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold text-lg ${
                          transaction.type === "credit"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "credit" ? "+" : "-"}₹
                        {transaction.amount.toLocaleString()}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          transaction.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "withdrawals" && (
          <div className="space-y-3">
            {withdrawals.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <i className="fas fa-hand-holding-usd text-gray-300 text-6xl mb-4"></i>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No Withdrawals Yet
                </h3>
                <p className="text-gray-600">Your withdrawal requests will appear here</p>
              </div>
            ) : (
              withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">
                        ₹{withdrawal.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(withdrawal.created_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        withdrawal.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : withdrawal.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {withdrawal.status.charAt(0).toUpperCase() +
                        withdrawal.status.slice(1)}
                    </span>
                  </div>

                  {withdrawal.remarks && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                      <i className="fas fa-comment-alt mr-2 text-gray-400"></i>
                      {withdrawal.remarks}
                    </div>
                  )}

                  {withdrawal.processed_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      Processed on{" "}
                      {new Date(withdrawal.processed_at).toLocaleDateString("en-IN")}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && wallet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Request Withdrawal</h2>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="fas fa-times text-gray-600"></i>
              </button>
            </div>

            <form onSubmit={handleWithdraw} className="p-6 space-y-4">
              <div className="bg-[#ff6f1e]/10 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">Available Balance</p>
                <p className="text-3xl font-bold text-[#ff6f1e]">
                  ₹{wallet.available_balance.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Withdrawal Amount (₹) *
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Minimum ₹500"
                  min="500"
                  max={wallet.available_balance}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  value={bankDetails.account_holder_name}
                  onChange={(e) =>
                    setBankDetails({ ...bankDetails, account_holder_name: e.target.value })
                  }
                  placeholder="Full name as per bank"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={bankDetails.account_number}
                  onChange={(e) =>
                    setBankDetails({ ...bankDetails, account_number: e.target.value })
                  }
                  placeholder="Bank account number"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC Code *
                </label>
                <input
                  type="text"
                  value={bankDetails.ifsc_code}
                  onChange={(e) =>
                    setBankDetails({
                      ...bankDetails,
                      ifsc_code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., SBIN0001234"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name *
                </label>
                <input
                  type="text"
                  value={bankDetails.bank_name}
                  onChange={(e) =>
                    setBankDetails({ ...bankDetails, bank_name: e.target.value })
                  }
                  placeholder="Name of your bank"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  required
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-900">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                Withdrawals are processed within 2-3 business days
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] hover:from-[#ff5f0e] hover:to-[#ff7c32] text-white font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg"
              >
                <i className="fas fa-paper-plane mr-2"></i>
                Submit Withdrawal Request
              </button>
            </form>
          </div>
        </div>
      )}

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
            className="flex flex-col items-center gap-1 transition-all text-[#ff6f1e] font-semibold"
          >
            <i className="fas fa-wallet text-xl animate-pulse"></i>
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
