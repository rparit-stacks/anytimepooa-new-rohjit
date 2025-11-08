"use client"

import { useEffect, useState } from "react"
import { getClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react"

interface Offer {
  id: string
  title: string
  description: string
  discount_percent: number | null
  discount_amount: number | null
  image_url: string
  valid_till: string
}

export default function OffersPage() {
  const router = useRouter()
  const supabase = getClient()
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await fetch("/api/offers")
        if (response.ok) {
          const data = await response.json()
          setOffers(data.data || [])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchOffers()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-orange-600" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 safe-area pb-6 animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 p-4 bg-white border-b border-gray-200 safe-area-top animate-slide-down">
        <button onClick={() => router.back()} className="text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">All Offers</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {offers.length > 0 ? (
          offers.map((offer, idx) => (
            <div
              key={offer.id}
              className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow animate-slide-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="h-40 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center relative overflow-hidden">
                <img
                  src={offer.image_url || "/placeholder.svg?height=160&width=400&query=offer"}
                  alt={offer.title}
                  className="h-full w-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{offer.title}</h3>
                <p className="text-gray-700 text-sm mb-4">{offer.description}</p>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {offer.discount_percent && (
                      <p className="text-3xl font-bold text-orange-600">{offer.discount_percent}% OFF</p>
                    )}
                    {offer.discount_amount && (
                      <p className="text-2xl font-bold text-orange-600">Save ₹{offer.discount_amount}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Valid Till</p>
                    <p className="font-semibold text-gray-900">{new Date(offer.valid_till).toLocaleDateString()}</p>
                  </div>
                </div>
                <button className="w-full py-3 bg-orange-600 text-white font-bold rounded-full hover:bg-orange-700 transition-all">
                  Claim Offer
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center bg-gray-50 rounded-2xl animate-scale-in">
            <AlertCircle className="mx-auto text-gray-400 mb-3" size={40} />
            <p className="text-gray-600 font-semibold">No offers available</p>
          </div>
        )}
      </div>
    </div>
  )
}
