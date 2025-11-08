"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Calendar, MapPin, Clock } from "lucide-react"
import { vibrate } from "@/lib/vibration"
import { showToast } from "@/components/toast"
import { checkSession } from "@/lib/client-auth"

interface Horoscope {
  id: string
  name: string
  horoscope_type: string
  chart_type: string
  created_at: string
}

export default function HoroscopePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [history, setHistory] = useState<Horoscope[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    date: new Date().getDate(),
    hours: 12,
    minutes: 0,
    seconds: 0,
    latitude: 28.6139, // Default Delhi
    longitude: 77.2090,
    timezone: 5.5,
    horoscope_type: "vedic",
    chart_type: "planets",
    observation_point: "topocentric",
    ayanamsha: "lahiri",
    language: "en",
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const isLoggedIn = await checkSession()
        if (!isLoggedIn) {
          router.push("/auth/login")
          return
        }

        // Fetch user profile for default location
        const profileResponse = await fetch("/api/user/profile")
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setUserProfile(profileData.data)
          if (profileData.data?.latitude && profileData.data?.longitude) {
            setFormData((prev) => ({
              ...prev,
              latitude: profileData.data.latitude,
              longitude: profileData.data.longitude,
            }))
          }
        }

        // Fetch horoscope history
        const historyResponse = await fetch("/api/horoscope/history")
        if (historyResponse.ok) {
          const historyData = await historyResponse.json()
          setHistory(historyData.data || [])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleGenerate = async () => {
    if (!formData.name.trim()) {
      showToast("Please enter a name for this horoscope", "error")
      return
    }

    setGenerating(true)
    try {
      vibrate()
      const response = await fetch("/api/horoscope/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        showToast("Horoscope generated successfully!", "success")
        setShowForm(false)
        // Refresh history
        const historyResponse = await fetch("/api/horoscope/history")
        if (historyResponse.ok) {
          const historyData = await historyResponse.json()
          setHistory(historyData.data || [])
        }
      } else {
        const error = await response.json()
        showToast(error.error || "Failed to generate horoscope", "error")
      }
    } catch (err) {
      console.error("Failed to generate horoscope:", err)
      showToast("Failed to generate horoscope. Please try again.", "error")
    } finally {
      setGenerating(false)
    }
  }

  const handleViewHoroscope = (id: string) => {
    vibrate()
    router.push(`/horoscope/${id}`)
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Horoscope</h1>
        <button
          onClick={() => {
            vibrate()
            setShowForm(!showForm)
          }}
          className="ml-auto bg-orange-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-orange-700 transition-all active:scale-95"
        >
          <i className="fas fa-plus mr-2"></i> Generate
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Generate Form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
            <h3 className="text-xl font-bold mb-4">Generate New Horoscope</h3>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., My Birth Chart"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Month</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: parseInt(e.target.value) })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hours</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: parseInt(e.target.value) })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={formData.minutes}
                  onChange={(e) => setFormData({ ...formData, minutes: parseInt(e.target.value) })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Timezone</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: parseFloat(e.target.value) })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Horoscope Type</label>
              <select
                value={formData.horoscope_type}
                onChange={(e) => setFormData({ ...formData, horoscope_type: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
              >
                <option value="vedic">Vedic/Indian Astrology</option>
                <option value="western">Western Astrology</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Chart Type</label>
              <select
                value={formData.chart_type}
                onChange={(e) => setFormData({ ...formData, chart_type: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
              >
                {formData.horoscope_type === "vedic" ? (
                  <>
                    <option value="planets">Planets</option>
                    <option value="rasi">Rasi Chart</option>
                    <option value="navamsa">Navamsa Chart (D9)</option>
                    <option value="hora">Hora Chart (D2)</option>
                    <option value="drekkana">Drekkana Chart (D3)</option>
                    <option value="chaturthamsa">Chaturthamsa Chart (D4)</option>
                    <option value="panchamasa">Panchamasa Chart (D5)</option>
                    <option value="shasthamsa">Shasthamsa Chart (D6)</option>
                    <option value="saptamsa">Saptamsa Chart (D7)</option>
                    <option value="ashtamsa">Ashtamsa Chart (D8)</option>
                    <option value="dasamsa">Dasamsa Chart (D10)</option>
                  </>
                ) : (
                  <>
                    <option value="planets">Planets</option>
                  </>
                )}
              </select>
            </div>

            {formData.horoscope_type === "vedic" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ayanamsha</label>
                <select
                  value={formData.ayanamsha}
                  onChange={(e) => setFormData({ ...formData, ayanamsha: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-600"
                >
                  <option value="lahiri">Lahiri</option>
                  <option value="sayana">Sayana</option>
                  <option value="tropical">Tropical</option>
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic"></i>
                    <span>Generate Horoscope</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  vibrate()
                  setShowForm(false)
                }}
                className="flex-1 bg-gray-200 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Horoscope History</h3>
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((horoscope) => (
                <div
                  key={horoscope.id}
                  onClick={() => handleViewHoroscope(horoscope.id)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-orange-50 transition-all cursor-pointer active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{horoscope.name}</h4>
                      <p className="text-sm text-gray-600">
                        {horoscope.horoscope_type.toUpperCase()} - {horoscope.chart_type}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(horoscope.created_at).toLocaleString()}
                      </p>
                    </div>
                    <i className="fas fa-chevron-right text-gray-400"></i>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-star-and-crescent text-gray-400 text-4xl mb-3 block"></i>
              <p className="text-gray-600">No horoscopes generated yet</p>
              <p className="text-sm text-gray-500 mt-2">Generate your first horoscope to see it here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


