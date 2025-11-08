"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { vibrate } from "@/lib/vibration"

interface Transaction {
  id: string
  type: string
  amount: number
  description: string
  status: string
  created_at: string
}

export default function WalletPage() {
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [addMoneyLoading, setAddMoneyLoading] = useState(false)

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const balanceRes = await fetch("/api/wallet/balance")
        if (balanceRes.status === 401) {
          router.push("/auth/login")
          return
        }
        if (balanceRes.ok) {
          const data = await balanceRes.json()
          setBalance(data.balance || 0)
        }

        const transactionsRes = await fetch("/api/wallet/transactions")
        if (transactionsRes.status === 401) {
          router.push("/auth/login")
          return
        }
        if (transactionsRes.ok) {
          const data = await transactionsRes.json()
          setTransactions(data.data || [])
        }
      } catch (err) {
        setError("Failed to load wallet data")
      } finally {
        setLoading(false)
      }
    }

    fetchWalletData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white pb-24" style={{ paddingBottom: "6rem" }}>
        <Loader2 className="animate-spin text-orange-600" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 pb-24 animate-fade-in relative overflow-x-hidden" style={{ paddingBottom: "6rem" }}>
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
        
        {/* Floating Icons */}
        <div className="absolute top-1/4 left-1/4 text-orange-400/20 animate-bounce" style={{ animationDuration: "3s" }}>
          <i className="fas fa-coins text-3xl"></i>
        </div>
        <div className="absolute top-1/3 right-1/4 text-yellow-400/20 animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>
          <i className="fas fa-wallet text-2xl"></i>
        </div>
        <div className="absolute bottom-1/3 left-1/3 text-amber-400/20 animate-bounce" style={{ animationDuration: "5s", animationDelay: "2s" }}>
          <i className="fas fa-money-bill-wave text-2xl"></i>
        </div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 p-4 bg-white border-b border-gray-200 safe-area-top animate-slide-down relative">
        <button
          onClick={() => {
            vibrate()
            router.back()
          }}
          className="text-gray-600 active:scale-95 transition-transform"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 relative z-10">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-8 text-white shadow-xl animate-scale-in hover:shadow-2xl transition-all">
          <p className="text-orange-100 text-sm font-semibold mb-2 flex items-center gap-2">
            <i className="fas fa-wallet"></i> Available Balance
          </p>
          <h2 className="text-5xl font-bold mb-8 flex items-center gap-2">
            <i className="fas fa-rupee-sign text-4xl"></i>
            {balance.toFixed(2)}
          </h2>
          <button
            onClick={() => {
              vibrate()
              setAddMoneyLoading(true)
              router.push("/wallet/add-money")
            }}
            disabled={addMoneyLoading}
            className="w-full py-3 bg-white text-orange-600 font-bold rounded-full hover:bg-gray-100 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {addMoneyLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <i className="fas fa-plus"></i> Add Money
              </>
            )}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 animate-slide-up relative z-10">
            <i className="fas fa-exclamation-circle text-red-600 text-xl flex-shrink-0"></i>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Transactions */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fas fa-history text-orange-600"></i> Transaction History
          </h3>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction, idx) => (
                <div
                  key={transaction.id}
                  className="bg-white rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow animate-slide-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`p-3 rounded-full ${transaction.type === "add_money" ? "bg-green-100" : "bg-red-100"}`}
                    >
                      {transaction.type === "add_money" ? (
                        <i className="fas fa-arrow-up text-green-600 text-xl"></i>
                      ) : (
                        <i className="fas fa-arrow-down text-red-600 text-xl"></i>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 capitalize">{transaction.type.replace("_", " ")}</p>
                      <p className="text-sm text-gray-600">{transaction.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`font-bold text-lg flex items-center gap-1 ${
                      transaction.type === "add_money" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {transaction.type === "add_money" ? (
                      <i className="fas fa-plus-circle"></i>
                    ) : (
                      <i className="fas fa-minus-circle"></i>
                    )}
                    <i className="fas fa-rupee-sign"></i>
                    {transaction.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-gray-50 rounded-2xl animate-scale-in">
              <i className="fas fa-receipt text-gray-400 text-5xl mb-3 block"></i>
              <p className="text-gray-600 font-semibold">No transactions yet</p>
              <p className="text-gray-500 text-sm mt-1">Your transaction history will appear here</p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
