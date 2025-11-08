"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { vibrate } from "@/lib/vibration"
import { showToast } from "@/components/toast"
import { checkSession } from "@/lib/client-auth"

interface HoroscopeData {
  id: string
  name: string
  horoscope_type: string
  chart_type: string
  chart_data: any
  chart_image_url?: string
  created_at: string
}

export default function HoroscopeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [horoscope, setHoroscope] = useState<HoroscopeData | null>(null)

  useEffect(() => {
    const fetchHoroscope = async () => {
      try {
        const isLoggedIn = await checkSession()
        if (!isLoggedIn) {
          router.push("/auth/login")
          return
        }

        const response = await fetch(`/api/horoscope/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setHoroscope(data.data)
        } else {
          showToast("Horoscope not found", "error")
          router.push("/horoscope")
        }
      } catch (err) {
        console.error("Failed to fetch horoscope:", err)
        showToast("Failed to load horoscope", "error")
        router.push("/horoscope")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchHoroscope()
    }
  }, [params.id, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white pb-24" style={{ paddingBottom: "6rem" }}>
        <Loader2 className="animate-spin text-orange-600" size={32} />
      </div>
    )
  }

  if (!horoscope) {
    return null
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
        <h1 className="text-2xl font-bold text-gray-900">{horoscope.name}</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Chart Image */}
        {horoscope.chart_image_url && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold mb-4">Chart Image</h3>
            <div className="flex justify-center">
              <img
                src={horoscope.chart_image_url}
                alt={horoscope.chart_type}
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Chart Data */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold mb-4">Chart Data</h3>
          <div className="space-y-4">
            {horoscope.chart_data?.output && Array.isArray(horoscope.chart_data.output) ? (
              <div className="space-y-3">
                {horoscope.chart_data.output.map((item: any, index: number) => (
                  <div key={index} className="border-b border-gray-200 pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {item.planet?.en || item.planet || "Planet"}
                        </p>
                        {item.zodiac_sign && (
                          <p className="text-sm text-gray-600">
                            {item.zodiac_sign.name?.en || item.zodiac_sign.name} ({item.zodiac_sign.number})
                          </p>
                        )}
                        {item.normDegree && (
                          <p className="text-xs text-gray-500">Degree: {item.normDegree.toFixed(2)}°</p>
                        )}
                        {item.isRetro && (
                          <span className="text-xs text-red-600">Retrograde</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(horoscope.chart_data, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold mb-4">Horoscope Information</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Type:</span> {horoscope.horoscope_type.toUpperCase()}
            </p>
            <p>
              <span className="font-semibold">Chart:</span> {horoscope.chart_type}
            </p>
            <p>
              <span className="font-semibold">Generated:</span>{" "}
              {new Date(horoscope.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


