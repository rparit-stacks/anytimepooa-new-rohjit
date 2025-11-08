"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { vibrate } from "@/lib/vibration"
import { checkSession } from "@/lib/client-auth"

interface Astrologer {
  id: string
  name: string
  avatar_url: string
  specializations: string[]
  rating: number
  review_count: number
  location: string
  price_per_session: number
  languages: string[]
}

export default function AstrologersPage() {
  const router = useRouter()
  const [astrologers, setAstrologers] = useState<Astrologer[]>([])
  const [filtered, setFiltered] = useState<Astrologer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("rating")

  useEffect(() => {
    const fetchAstrologers = async () => {
      try {
        const isLoggedIn = await checkSession()
        if (!isLoggedIn) {
          router.push("/auth/login")
          return
        }

        // Get user location for filtering
        const userResponse = await fetch("/api/user/profile")
        let userCity = ""
        if (userResponse.ok) {
          const userData = await userResponse.json()
          userCity = userData.data?.city || userData.data?.location || ""
        }

        const response = await fetch("/api/astrologers")
        if (response.ok) {
          const data = await response.json()
          let allAstrologers = data.data || []
          
          // Filter by location if user city is available
          if (userCity) {
            allAstrologers = allAstrologers.filter((astro: any) => {
              const astroLocation = (astro.location || "").toLowerCase()
              const userLocation = userCity.toLowerCase()
              return astroLocation.includes(userLocation) || userLocation.includes(astroLocation)
            })
          }
          
          setAstrologers(allAstrologers)
          setFiltered(allAstrologers)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAstrologers()
  }, [router])

  useEffect(() => {
    const result = astrologers.filter(
      (a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.specializations.some((s) => s.toLowerCase().includes(search.toLowerCase())),
    )

    if (sortBy === "rating") {
      result.sort((a, b) => b.rating - a.rating)
    } else if (sortBy === "price-low") {
      result.sort((a, b) => a.price_per_session - b.price_per_session)
    } else if (sortBy === "price-high") {
      result.sort((a, b) => b.price_per_session - a.price_per_session)
    }

    setFiltered(result)
  }, [search, sortBy, astrologers])

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
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
        
        {/* Floating Stars */}
        <div className="absolute top-1/4 left-1/4 text-yellow-400/20 animate-bounce" style={{ animationDuration: "3s" }}>
          <i className="fas fa-star text-3xl"></i>
        </div>
        <div className="absolute top-1/3 right-1/4 text-orange-400/20 animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>
          <i className="fas fa-star text-2xl"></i>
        </div>
        <div className="absolute bottom-1/3 left-1/3 text-amber-400/20 animate-bounce" style={{ animationDuration: "5s", animationDelay: "2s" }}>
          <i className="fas fa-star text-2xl"></i>
        </div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 p-4 bg-white border-b border-gray-200 safe-area-top animate-slide-down relative">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => {
              vibrate()
              router.back()
            }}
            className="text-gray-600 active:scale-95 transition-transform"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Astrologers</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-3 text-gray-400 text-lg"></i>
          <input
            type="text"
            placeholder="Search by name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={(e) => {
              setTimeout(() => {
                e.target.scrollIntoView({ behavior: "smooth", block: "center" })
              }, 300)
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Sort */}
        <div className="mt-3 flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="rating">Sort by Rating</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4 relative z-10">
        {filtered.length > 0 ? (
          filtered.map((astrologer, idx) => (
            <div
              key={astrologer.id}
              className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all animate-slide-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex gap-4 p-4">
                <img
                  src={astrologer.avatar_url || "/placeholder.svg?height=100&width=100&query=astrologer"}
                  alt={astrologer.name}
                  className="w-24 h-24 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">{astrologer.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <i className="fas fa-star text-yellow-500"></i>
                      <span className="font-semibold">{astrologer.rating}</span>
                    </div>
                    <span className="text-xs text-gray-600">({astrologer.review_count} reviews)</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                    <i className="fas fa-map-marker-alt text-orange-600"></i> {astrologer.location}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {astrologer.specializations?.map((spec) => (
                      <span key={spec} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                        {spec}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Languages: {astrologer.languages?.join(", ")}</p>
                  <p className="text-lg font-bold text-orange-600 mt-2">₹{astrologer.price_per_session}/session</p>
                </div>
              </div>
              <div className="flex gap-2 p-4 pt-0">
                <Link
                  href={`/astrologer/${astrologer.id}`}
                  className="flex-1 py-2 bg-white border border-orange-600 text-orange-600 rounded-full font-semibold hover:bg-orange-50 transition-all text-center"
                >
                  View Profile
                </Link>
                <button
                  onClick={() => {
                    vibrate()
                    alert("Razorpay is now enabled. Please contact developer to proceed with booking.")
                  }}
                  className="flex-1 py-2 bg-orange-600 text-white rounded-full font-semibold hover:bg-orange-700 transition-all active:scale-95"
                >
                  Book
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center bg-gray-50 rounded-2xl animate-scale-in relative z-10">
            <i className="fas fa-user-astronaut text-gray-400 text-5xl mb-3 block"></i>
            <p className="text-gray-600 font-semibold">No astrologers found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your search filters</p>
          </div>
        )}
      </div>

    </div>
  )
}
