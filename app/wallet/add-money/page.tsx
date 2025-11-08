"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { vibrate, vibratePattern } from "@/lib/vibration"

interface Offer {
  id: string
  title: string
  description: string
  bonus: number
  originalAmount: number
  finalAmount: number
}

const quickAmounts = [100, 250, 500, 1000, 2000, 5000]

const offers: Offer[] = [
  {
    id: "1",
    title: "First Recharge Bonus",
    description: "Get ₹50 bonus on ₹500 recharge",
    bonus: 50,
    originalAmount: 500,
    finalAmount: 550,
  },
  {
    id: "2",
    title: "Mega Recharge Offer",
    description: "Get ₹200 bonus on ₹2000 recharge",
    bonus: 200,
    originalAmount: 2000,
    finalAmount: 2200,
  },
  {
    id: "3",
    title: "Super Saver",
    description: "Get ₹500 bonus on ₹5000 recharge",
    bonus: 500,
    originalAmount: 5000,
    finalAmount: 5500,
  },
]

const paymentGateways = [
  { id: "razorpay", name: "Razorpay", icon: "fa-credit-card", color: "bg-blue-600" },
  { id: "paytm", name: "Paytm", icon: "fa-wallet", color: "bg-blue-500" },
  { id: "phonepe", name: "PhonePe", icon: "fa-mobile-alt", color: "bg-purple-600" },
  { id: "gpay", name: "Google Pay", icon: "fa-google", color: "bg-green-600" },
  { id: "upi", name: "UPI", icon: "fa-university", color: "bg-orange-600" },
]

export default function AddMoneyPage() {
  const router = useRouter()
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAmountSelect = (amount: number) => {
    vibrate()
    setSelectedAmount(amount)
    setCustomAmount("")
    setSelectedOffer(null)
  }

  const handleCustomAmount = (value: string) => {
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue > 0) {
      setSelectedAmount(numValue)
      setCustomAmount(value)
      setSelectedOffer(null)
    } else {
      setSelectedAmount(null)
      setCustomAmount(value)
    }
  }

  const handleOfferSelect = (offer: Offer) => {
    vibrate()
    setSelectedOffer(offer)
    setSelectedAmount(offer.originalAmount)
    setCustomAmount(offer.originalAmount.toString())
  }

  const handleGatewaySelect = (gatewayId: string) => {
    vibrate()
    setSelectedGateway(gatewayId)
  }

  const handleProceed = async () => {
    if (!selectedAmount || selectedAmount <= 0) {
      alert("Please select an amount")
      return
    }

    if (!selectedGateway) {
      alert("Please select a payment gateway")
      return
    }

    vibratePattern([50, 30, 50])
    setLoading(true)

    // Simulate payment processing
    setTimeout(() => {
      setLoading(false)
      alert(`Payment of ₹${selectedAmount} initiated via ${paymentGateways.find((g) => g.id === selectedGateway)?.name}`)
      router.push("/wallet")
    }, 2000)
  }

  const finalAmount = selectedOffer ? selectedOffer.finalAmount : selectedAmount || 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 pb-24 relative overflow-x-hidden" style={{ paddingBottom: "6rem" }}>
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

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
        <h1 className="text-2xl font-bold text-gray-900">Add Money</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 relative z-10">
        {/* Quick Amount Selection */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <i className="fas fa-bolt text-orange-600"></i> Quick Amount
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handleAmountSelect(amount)}
                className={`p-4 rounded-xl border-2 transition-all active:scale-95 ${
                  selectedAmount === amount
                    ? "border-orange-600 bg-orange-50 text-orange-600"
                    : "border-gray-200 bg-white text-gray-900 hover:border-orange-300"
                }`}
              >
                <div className="font-bold text-lg">₹{amount}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <i className="fas fa-edit text-orange-600"></i> Custom Amount
          </h3>
          <div className="relative">
            <i className="fas fa-rupee-sign absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="number"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => handleCustomAmount(e.target.value)}
              onFocus={(e) => {
                // Scroll input into view when keyboard opens
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: "smooth", block: "center" })
                }, 300)
              }}
              className="w-full pl-10 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200"
              min="1"
            />
          </div>
        </div>

        {/* Offers */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <i className="fas fa-gift text-orange-600"></i> Special Offers
          </h3>
          <div className="space-y-3">
            {offers.map((offer) => (
              <button
                key={offer.id}
                onClick={() => handleOfferSelect(offer)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left active:scale-95 ${
                  selectedOffer?.id === offer.id
                    ? "border-orange-600 bg-orange-50"
                    : "border-gray-200 bg-white hover:border-orange-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{offer.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{offer.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                        +₹{offer.bonus} Bonus
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 line-through">₹{offer.originalAmount}</div>
                    <div className="text-xl font-bold text-orange-600">₹{offer.finalAmount}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Gateway Selection */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <i className="fas fa-credit-card text-orange-600"></i> Select Payment Method
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {paymentGateways.map((gateway) => (
              <button
                key={gateway.id}
                onClick={() => handleGatewaySelect(gateway.id)}
                className={`p-4 rounded-xl border-2 transition-all active:scale-95 ${
                  selectedGateway === gateway.id
                    ? "border-orange-600 bg-orange-50"
                    : "border-gray-200 bg-white hover:border-orange-300"
                }`}
              >
                <div className={`w-12 h-12 ${gateway.color} rounded-full flex items-center justify-center mb-2 mx-auto`}>
                  <i className={`fas ${gateway.icon} text-white text-xl`}></i>
                </div>
                <div className="text-sm font-semibold text-gray-900 text-center">{gateway.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        {selectedAmount && selectedAmount > 0 && (
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-100">Amount to Pay</span>
              <span className="text-2xl font-bold">₹{finalAmount}</span>
            </div>
            {selectedOffer && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-orange-100">Base Amount</span>
                <span className="line-through">₹{selectedOffer.originalAmount}</span>
              </div>
            )}
            {selectedOffer && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-orange-100">Bonus</span>
                <span className="font-semibold">+₹{selectedOffer.bonus}</span>
              </div>
            )}
          </div>
        )}

        {/* Proceed Button */}
        <button
          onClick={handleProceed}
          disabled={!selectedAmount || !selectedGateway || loading || selectedAmount <= 0}
          className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <i className="fas fa-lock"></i>
              <span>Proceed to Pay ₹{finalAmount}</span>
            </>
          )}
        </button>
      </div>

    </div>
  )
}

