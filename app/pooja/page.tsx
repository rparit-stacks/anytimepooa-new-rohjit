"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { vibrate } from "@/lib/vibration"
import { showToast } from "@/components/toast"
import { checkSession } from "@/lib/client-auth"
import Link from "next/link"

interface PoojaService {
  id: string
  name: string
  description: string
  image_url: string
  base_price: number
  duration_hours: number
}

export default function PoojaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<PoojaService[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const isLoggedIn = await checkSession()
        if (!isLoggedIn) {
          router.push("/auth/login")
          return
        }

        const response = await fetch("/api/pooja/services")
        if (response.ok) {
          const data = await response.json()
          setServices(data.data || [])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

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
        <h1 className="text-2xl font-bold text-gray-900">Book Pooja Service</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-2">Select a Pooja Service</h2>
          <p className="text-gray-600 text-sm">Choose the pooja service you want to book</p>
        </div>

        {services.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((service) => (
              <Link
                key={service.id}
                href={`/pooja/${service.id}/astrologers`}
                onClick={() => vibrate()}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={service.image_url || "https://images.unsplash.com/photo-1601370690183-1c7796ecec78?w=400&h=300&fit=crop&q=80"}
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    ₹{service.base_price}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">{service.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{service.description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <i className="fas fa-clock"></i>
                    <span>{service.duration_hours} hours</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <i className="fas fa-praying-hands text-gray-400 text-5xl mb-4 block"></i>
            <p className="text-gray-600">No pooja services available</p>
          </div>
        )}
      </div>
    </div>
  )
}


