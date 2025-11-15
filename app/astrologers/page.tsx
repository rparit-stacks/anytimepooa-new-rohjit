"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { vibrate } from "@/lib/vibration"
import { checkSession } from "@/lib/client-auth"

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}


interface Astrologer {
  id: string
  name: string
  avatar_url: string
  specializations: string[]
  rating: number
  review_count: number
  location: string
  price_per_session?: number | null
  rate_session_per_minute?: number | null
  rate_video_per_minute?: number | null
  rate_chat_per_minute?: number | null
  languages?: string[]
}

type ViewMode = "default" | "map"
const DEFAULT_OPTION = "All"

export default function AstrologersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [astrologers, setAstrologers] = useState<Astrologer[]>([])
  const [filtered, setFiltered] = useState<Astrologer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("rating")
  const [cityFilter, setCityFilter] = useState<string>(DEFAULT_OPTION)
  const [categoryFilter, setCategoryFilter] = useState<string>(DEFAULT_OPTION)
  const [cityOptions, setCityOptions] = useState<string[]>([DEFAULT_OPTION])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([DEFAULT_OPTION])
  const [viewMode, setViewMode] = useState<ViewMode>("default")
  const [userCity, setUserCity] = useState("")
  const isInitialized = useRef(false)
  const isReadyForRefetch = useRef(false)
  const compareRates = (a: Astrologer, b: Astrologer, direction: "asc" | "desc") => {
    const rateA = toNumber(a.rate_session_per_minute ?? a.price_per_session)
    const rateB = toNumber(b.rate_session_per_minute ?? b.price_per_session)

    if (rateA === null && rateB === null) return 0
    if (rateA === null) return 1
    if (rateB === null) return -1

    return direction === "asc" ? rateA - rateB : rateB - rateA
  }

  const loadAstrologers = useCallback(
    async (cityValue: string, categoryValue: string, mode: ViewMode = "default") => {
      const params = new URLSearchParams()

      if (cityValue && cityValue !== DEFAULT_OPTION) {
        params.set("city", cityValue)
      }

      if (categoryValue && categoryValue !== DEFAULT_OPTION) {
        params.set("category", categoryValue)
      }

      if (mode === "map") {
        params.set("view", "map")
      }

      const queryString = params.toString()
      const response = await fetch(`/api/astrologers${queryString ? `?${queryString}` : ""}`)

      if (!response.ok) {
        setAstrologers([])
        setFiltered([])
        setCityOptions((previous) =>
          previous.includes(DEFAULT_OPTION) ? previous : [DEFAULT_OPTION, ...previous],
        )
        setCategoryOptions((previous) =>
          previous.includes(DEFAULT_OPTION) ? previous : [DEFAULT_OPTION, ...previous],
        )
        return
      }

      const payload = await response.json()
      const rawList = Array.isArray(payload.data) ? payload.data : []
      const normalizedList: Astrologer[] = rawList.map((item: any) => ({
        ...item,
        price_per_session: toNumber(item.price_per_session),
        rate_session_per_minute: toNumber(item.rate_session_per_minute),
        rate_video_per_minute: toNumber(item.rate_video_per_minute),
        rate_chat_per_minute: toNumber(item.rate_chat_per_minute),
        languages: Array.isArray(item.languages)
          ? item.languages
          : typeof item.languages === "string" && item.languages.length > 0
            ? item.languages.split(",").map((lang: string) => lang.trim())
            : [],
      }))

      setAstrologers(normalizedList)

      const citiesFromPayload: string[] = Array.isArray(payload.filters?.cities)
        ? payload.filters.cities.filter((item: string) => Boolean(item))
        : []
      const categoriesFromPayload: string[] = Array.isArray(payload.filters?.categories)
        ? payload.filters.categories.filter((item: string) => Boolean(item))
        : []

      const uniqueCityOptions = Array.from(
        new Set([DEFAULT_OPTION, ...(userCity ? [userCity] : []), ...citiesFromPayload]),
      )
      const uniqueCategoryOptions = Array.from(
        new Set([DEFAULT_OPTION, ...categoriesFromPayload]),
      )

      setCityOptions(uniqueCityOptions)
      setCategoryOptions(uniqueCategoryOptions)
    },
    [userCity],
  )

  useEffect(() => {
    const initialize = async () => {
      if (isInitialized.current) {
        return
      }
      isInitialized.current = true
      setLoading(true)

      try {
        const isLoggedIn = await checkSession()
        if (!isLoggedIn) {
          router.push("/auth/login")
          return
        }

        // Fetch user profile to determine city
        let detectedCity = ""
        try {
          const userResponse = await fetch("/api/user/profile")
          if (userResponse.ok) {
            const userData = await userResponse.json()
            detectedCity = userData.data?.city || userData.data?.location || ""
            setUserCity(detectedCity)
          }
        } catch {
          // swallow profile error; filters will fall back to "All"
        }

        const incomingView = (searchParams.get("view") || "").toLowerCase() as ViewMode
        const mode: ViewMode = incomingView === "map" ? "map" : "default"
        setViewMode(mode)

        const initialCity = mode === "map" && detectedCity ? detectedCity : DEFAULT_OPTION
        setCityFilter(initialCity)
        setCategoryFilter(DEFAULT_OPTION)

        await loadAstrologers(initialCity, DEFAULT_OPTION, mode)
        isReadyForRefetch.current = true
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [loadAstrologers, router, searchParams])

  useEffect(() => {
    if (!isReadyForRefetch.current) {
      return
    }

    const refetch = async () => {
      setLoading(true)
      try {
        await loadAstrologers(cityFilter, categoryFilter, viewMode)
      } finally {
        setLoading(false)
      }
    }

    refetch()
  }, [cityFilter, categoryFilter, loadAstrologers, viewMode])

  useEffect(() => {
    const loweredSearch = search.toLowerCase()
    const result = astrologers.filter((a) => {
      const matchesName = a.name?.toLowerCase().includes(loweredSearch)
      const matchesSpecialization = a.specializations?.some((s) =>
        s.toLowerCase().includes(loweredSearch),
      )
      const matchesLocation = a.location?.toLowerCase().includes(loweredSearch)
      return matchesName || matchesSpecialization || matchesLocation
    })

    if (sortBy === "rating") {
      result.sort((a, b) => b.rating - a.rating)
    } else if (sortBy === "price-low") {
      result.sort((a, b) => compareRates(a, b, "asc"))
    } else if (sortBy === "price-high") {
      result.sort((a, b) => compareRates(a, b, "desc"))
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
        <div className="mt-3 flex gap-2 flex-wrap">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {cityOptions.map((option) => (
              <option key={option} value={option}>
                {option === DEFAULT_OPTION ? "All Locations" : option}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option === DEFAULT_OPTION ? "All Categories" : option}
              </option>
            ))}
          </select>
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
          filtered.map((astrologer, idx) => {
            const sessionRateRaw = toNumber(
              astrologer.rate_session_per_minute ?? astrologer.price_per_session,
            )
            const videoRate = toNumber(astrologer.rate_video_per_minute)
            const chatRate = toNumber(astrologer.rate_chat_per_minute)
            const chatLabel = chatRate !== null ? `Chat ₹${chatRate.toFixed(0)}/min` : null
            const videoLabel = videoRate !== null ? `Video ₹${videoRate.toFixed(0)}/min` : null
            const languageLabel =
              astrologer.languages && astrologer.languages.length > 0
                ? astrologer.languages.join(", ")
                : "Not specified"
            const sessionRateLabel =
              sessionRateRaw !== null ? `₹${sessionRateRaw.toFixed(0)}/min` : null

            return (
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
                  <p className="text-sm text-gray-600 mt-2">Languages: {languageLabel}</p>
                  <div className="space-y-1 mt-2">
                    {sessionRateLabel ? (
                      <p className="text-lg font-bold text-orange-600">
                        {sessionRateLabel}{" "}
                        <span className="text-xs font-semibold text-gray-500">(Session)</span>
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-gray-500">Session rate not available</p>
                    )}
                    {(videoLabel || chatLabel) && (
                      <div className="flex flex-wrap gap-2 text-xs text-gray-600 font-medium">
                        {videoLabel && (
                          <span className="px-2 py-1 bg-orange-50 border border-orange-100 rounded-full">{videoLabel}</span>
                        )}
                        {chatLabel && (
                          <span className="px-2 py-1 bg-orange-50 border border-orange-100 rounded-full">{chatLabel}</span>
                        )}
                      </div>
                    )}
                  </div>
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
            )
          })
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
