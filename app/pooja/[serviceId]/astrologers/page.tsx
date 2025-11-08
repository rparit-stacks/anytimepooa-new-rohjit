"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Loader2, MapPin } from "lucide-react"
import { vibrate } from "@/lib/vibration"
import { showToast } from "@/components/toast"
import { checkSession } from "@/lib/client-auth"
import Link from "next/link"

interface Astrologer {
  id: string
  name: string
  avatar_url?: string
  rating: number
  review_count: number
  location: string
  price_per_session: number
  distance_km?: number
  service_price: number
  total_price: number
}

interface PoojaService {
  id: string
  name: string
  base_price: number
}

export default function PoojaAstrologersPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [astrologers, setAstrologers] = useState<Astrologer[]>([])
  const [service, setService] = useState<PoojaService | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const isLoggedIn = await checkSession()
        if (!isLoggedIn) {
          router.push("/auth/login")
          return
        }

        // Fetch user profile
        const profileResponse = await fetch("/api/user/profile")
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setUserProfile(profileData.data)
        }

        // Fetch pooja service
        const serviceResponse = await fetch("/api/pooja/services")
        if (serviceResponse.ok) {
          const serviceData = await serviceResponse.json()
          const selectedService = serviceData.data?.find((s: any) => s.id === params.serviceId)
          setService(selectedService)
        }

        // Fetch astrologers
        const astroResponse = await fetch("/api/pooja/astrologers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pooja_service_id: params.serviceId,
            city: userProfile?.city || userProfile?.location,
            latitude: userProfile?.latitude,
            longitude: userProfile?.longitude,
          }),
        })

        if (astroResponse.ok) {
          const astroData = await astroResponse.json()
          setAstrologers(astroData.data || [])
        }
      } finally {
        setLoading(false)
      }
    }

    if (params.serviceId) {
      fetchData()
    }
  }, [params.serviceId, router])

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
        <h1 className="text-2xl font-bold text-gray-900">
          {service?.name || "Select Astrologer"}
        </h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {service && (
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{service.name}</h3>
                <p className="text-sm text-gray-600">Service Price: ₹{service.base_price}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Total includes</p>
                <p className="text-xs text-gray-500">astrologer fee</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <h3 className="font-bold mb-4">Available Astrologers Near You</h3>
          {astrologers.length > 0 ? (
            <div className="space-y-4">
              {astrologers.map((astrologer) => (
                <Link
                  key={astrologer.id}
                  href={`/pooja/${params.serviceId}/book/${astrologer.id}`}
                  onClick={() => vibrate()}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-orange-50 transition-all active:scale-95"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={astrologer.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80"}
                      alt={astrologer.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-lg">{astrologer.name}</h4>
                        <div className="flex items-center gap-1">
                          <i className="fas fa-star text-yellow-500 text-sm"></i>
                          <span className="text-sm font-semibold">{Number(astrologer.rating).toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                        <MapPin size={14} />
                        {astrologer.location}
                        {astrologer.distance_km && (
                          <span className="text-orange-600 font-semibold ml-2">
                            {astrologer.distance_km} km away
                          </span>
                        )}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          <p className="text-xs text-gray-500">Service: ₹{astrologer.service_price}</p>
                          <p className="text-xs text-gray-500">Astrologer: ₹{astrologer.price_per_session}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="text-lg font-bold text-orange-600">₹{astrologer.total_price}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-user-astronaut text-gray-400 text-4xl mb-3 block"></i>
              <p className="text-gray-600">No astrologers available in your area</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


