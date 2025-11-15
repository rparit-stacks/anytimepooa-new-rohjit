"use client"

import { Card } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { TopNavbar } from "@/components/navbar"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { vibrate } from "@/lib/vibration"
import { SidebarMenu } from "./sidebar-menu"
import { showToast } from "./toast"

// Placeholder image constant
const PLACEHOLDER_IMAGE = "/istockphoto-1427121205-612x612.jpg"

interface User {
  id: string
  email: string
  full_name?: string | null
  city?: string | null
  location?: string | null
  [key: string]: any
}

interface Astrologer {
  id: string
  name: string
  avatar_url?: string
  rating: number
  review_count: number
  location?: string
  price_per_session?: number | null
  rate_session_per_minute?: number | null
  rate_video_per_minute?: number | null
  rate_chat_per_minute?: number | null
  specializations?: string[]
}

interface Offer {
  id: string
  title: string
  description?: string
  discount_percent?: number
  image_url?: string
}

interface Testimonial {
  id: string
  user_name: string
  user_avatar_url?: string
  rating: number
  review_text: string
  astrologer_name?: string
}

interface Category {
  id: string
  name: string
  icon?: string
  image_url?: string
}

export function DashboardClient({ user }: { user: User }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showCityPrompt, setShowCityPrompt] = useState(false)
  const [cityInput, setCityInput] = useState("")
  const [astrologers, setAstrologers] = useState<Astrologer[]>([])
  const [loadingAstrologers, setLoadingAstrologers] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsLoaded(true)
    // Check if city is missing and prompt user
    if (!user.city && !user.location) {
      setShowCityPrompt(true)
    }

    // Fetch astrologers from DB
    const fetchAstrologers = async () => {
      try {
        const response = await fetch("/api/astrologers")
        if (response.ok) {
          const data = await response.json()
          setAstrologers(data.data || [])
        }
      } catch (err) {
        console.error("Failed to fetch astrologers:", err)
      } finally {
        setLoadingAstrologers(false)
      }
    }
    fetchAstrologers()
  }, [user])

  // Auto-slide carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleCitySave = async () => {
    if (!cityInput.trim()) {
      alert("Please enter your city")
      return
    }
    try {
      vibrate()
      const response = await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: cityInput.trim() }),
      })
      if (response.ok) {
        setShowCityPrompt(false)
        showToast("City updated successfully!", "success")
        window.location.reload()
      }
    } catch (err) {
      showToast("Failed to update city", "error")
    }
  }

  const userName = user.full_name || user.email?.split("@")[0] || "Cosmic Traveler"
  const userCity = user.city || user.location || "Your City"
  
  // Get user location for map (default to Delhi if not available)
  const userLat = user.latitude || 28.6139
  const userLng = user.longitude || 77.2090

  // Mock data - Replace with API calls
  const heroSlides = [
    {
      id: 1,
      title: "Get 50% Off on First Consultation",
      subtitle: "Connect with Expert Astrologers",
      image: PLACEHOLDER_IMAGE,
      cta: "Book Now",
      link: "/astrologers",
    },
    {
      id: 2,
      title: "Daily Horoscope - Free Reading",
      subtitle: "Discover what the stars have in store",
      image: PLACEHOLDER_IMAGE,
      cta: "Read Now",
      link: "/dashboard",
    },
    {
      id: 3,
      title: "Premium Kundli Report",
      subtitle: "Detailed birth chart analysis",
      image: PLACEHOLDER_IMAGE,
      cta: "Generate Report",
      link: "/dashboard",
    },
  ]

  // Use astrologers from DB, fallback to empty array
  const nearbyAstrologers = astrologers.length > 0 ? astrologers.slice(0, 6) : []
  const parseRate = (value: unknown) => {
    if (value === null || value === undefined) return null
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
  }

  const categories: Category[] = [
    { id: "1", name: "Vedic Astrology", icon: "fa-star", image_url: PLACEHOLDER_IMAGE },
    { id: "2", name: "Tarot Reading", icon: "fa-cards", image_url: PLACEHOLDER_IMAGE },
    { id: "3", name: "Numerology", icon: "fa-hashtag", image_url: PLACEHOLDER_IMAGE },
    { id: "4", name: "Palmistry", icon: "fa-hand", image_url: PLACEHOLDER_IMAGE },
    { id: "5", name: "Vastu Shastra", icon: "fa-home", image_url: PLACEHOLDER_IMAGE },
    { id: "6", name: "Feng Shui", icon: "fa-yin-yang", image_url: PLACEHOLDER_IMAGE },
  ]

  const offers: Offer[] = [
    {
      id: "1",
      title: "First Consultation 50% Off",
      description: "Get your first astrology consultation at half price",
      discount_percent: 50,
      image_url: PLACEHOLDER_IMAGE,
    },
    {
      id: "2",
      title: "Kundli Report - Special Price",
      description: "Complete birth chart analysis at ₹299 only",
      discount_percent: 30,
      image_url: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=400&h=200&fit=crop&q=80",
    },
    {
      id: "3",
      title: "Weekly Horoscope Pack",
      description: "7-day detailed horoscope predictions",
      discount_percent: 25,
      image_url: "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=400&h=200&fit=crop&q=80",
    },
  ]

  const testimonials: Testimonial[] = [
    {
      id: "1",
      user_name: "Rahul Sharma",
      user_avatar_url: PLACEHOLDER_IMAGE,
      rating: 5,
      review_text: "Amazing experience! The predictions were accurate and the astrologer was very helpful.",
      astrologer_name: "Pandit Rajesh",
    },
    {
      id: "2",
      user_name: "Priya Patel",
      user_avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&q=80",
      rating: 5,
      review_text: "Got clarity on my career path. Highly recommend this platform!",
      astrologer_name: "Dr. Priya Sharma",
    },
    {
      id: "3",
      user_name: "Amit Kumar",
      user_avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&q=80",
      rating: 4,
      review_text: "Good service and timely responses. Will use again.",
      astrologer_name: "Acharya Vikram",
    },
  ]

  const trendingItems = [
    {
      id: "1",
      title: "Premium Kundli Report",
      image: PLACEHOLDER_IMAGE,
      price: 299,
      originalPrice: 499,
    },
    {
      id: "2",
      title: "Love Compatibility Check",
      image: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=300&h=300&fit=crop&q=80",
      price: 199,
      originalPrice: 299,
    },
    {
      id: "3",
      title: "Career Guidance Session",
      image: "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=300&h=300&fit=crop&q=80",
      price: 399,
      originalPrice: 599,
    },
  ]

  const blogPosts = [
    {
      id: "1",
      title: "Understanding Your Birth Chart",
      excerpt: "Learn how to read and interpret your natal chart for better life insights.",
      image: PLACEHOLDER_IMAGE,
      date: "2 days ago",
    },
    {
      id: "2",
      title: "Planetary Transits This Month",
      excerpt: "Discover how current planetary movements affect your zodiac sign.",
      image: PLACEHOLDER_IMAGE,
      date: "5 days ago",
    },
    {
      id: "3",
      title: "Vastu Tips for Home",
      excerpt: "Simple Vastu remedies to bring positive energy into your living space.",
      image: "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=400&h=250&fit=crop&q=80",
      date: "1 week ago",
    },
  ]

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-background via-background to-secondary flex flex-col safe-area-top pb-24 relative overflow-x-hidden" style={{ paddingBottom: "6rem" }}>
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
        <div className="absolute bottom-40 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "0.5s" }}></div>
        
        {/* Floating Stars */}
        <div className="absolute top-1/4 left-1/4 text-yellow-400/20 animate-bounce" style={{ animationDuration: "3s" }}>
          <i className="fas fa-star text-2xl"></i>
            </div>
        <div className="absolute top-1/3 right-1/4 text-yellow-400/20 animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>
          <i className="fas fa-star text-xl"></i>
          </div>
        <div className="absolute bottom-1/3 left-1/3 text-yellow-400/20 animate-bounce" style={{ animationDuration: "5s", animationDelay: "2s" }}>
          <i className="fas fa-star text-lg"></i>
          </div>
        <div className="absolute top-1/2 right-1/3 text-yellow-400/20 animate-bounce" style={{ animationDuration: "3.5s", animationDelay: "0.5s" }}>
          <i className="fas fa-star text-xl"></i>
        </div>
          </div>

      <TopNavbar userName={userName} onMenuClick={() => setShowSidebar(true)} />
      <SidebarMenu isOpen={showSidebar} onClose={() => setShowSidebar(false)} userName={userName} />

      {/* City Prompt Modal */}
      {showCityPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold mb-2">Enter Your City</h3>
            <p className="text-gray-600 mb-4 text-sm">We couldn't detect your location. Please enter your city to find nearby astrologers.</p>
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Enter your city"
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-orange-600"
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: "smooth", block: "center" })
                }, 300)
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={handleCitySave}
                className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-all active:scale-95"
              >
                Save
              </button>
              <button
                onClick={() => {
                  vibrate()
                  setShowCityPrompt(false)
                }}
                className="flex-1 bg-gray-200 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all active:scale-95"
              >
                Skip
              </button>
            </div>
          </div>
          </div>
        )}

      <main
        className={`flex-1 w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 transition-all duration-700 relative z-10 ${isLoaded ? "animate-fade-in" : "opacity-0"}`}
      >
        {/* Welcome Section */}
        <div className="mb-5 sm:mb-6">
          <h2 className="text-xl sm:text-3xl font-bold mb-1 text-pretty">
            Welcome, <span className="text-orange-600">{userName}</span>
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">Explore your cosmic destiny</p>
        </div>

        {/* 1. Hero Carousel */}
        <section className="mb-6">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl h-56 sm:h-72">
            <div className="absolute inset-0">
              {heroSlides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentSlide ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <img
                    src={slide.image || PLACEHOLDER_IMAGE}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = PLACEHOLDER_IMAGE
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/60 to-transparent"></div>
                  <div className="absolute inset-0 flex flex-col justify-center items-start p-5 sm:p-8 text-white">
                    <h3 className="text-xl sm:text-3xl font-bold mb-2 leading-tight">{slide.title}</h3>
                    <p className="text-sm sm:text-base mb-4 text-white/95 leading-relaxed">{slide.subtitle}</p>
                    <Link
                      href={slide.link}
                      onClick={() => vibrate()}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-full font-semibold transition-all active:scale-95 shadow-xl text-sm sm:text-base"
                    >
                      <i className="fas fa-arrow-right mr-2"></i>
                      {slide.cta}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            {/* Carousel Indicators */}
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    vibrate()
                    setCurrentSlide(index)
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentSlide ? "bg-white w-8" : "bg-white/50 w-2"
                  }`}
                />
              ))}
            </div>
            {/* Navigation Arrows */}
            <button
              onClick={() => {
                vibrate()
                setCurrentSlide((prev) => (prev - 1 + 3) % 3)
              }}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-white/25 hover:bg-white/35 backdrop-blur-sm text-white p-2.5 rounded-full transition-all active:scale-95 z-10"
            >
              <i className="fas fa-chevron-left text-sm"></i>
            </button>
            <button
              onClick={() => {
                vibrate()
                setCurrentSlide((prev) => (prev + 1) % 3)
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white/25 hover:bg-white/35 backdrop-blur-sm text-white p-2.5 rounded-full transition-all active:scale-95 z-10"
            >
              <i className="fas fa-chevron-right text-sm"></i>
            </button>
          </div>
        </section>

        {/* 2. Astrologers Near You */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <i className="fas fa-map-marker-alt text-orange-600 text-xl"></i> 
              <span>Astrologers Near You</span>
            </h3>
            <Link 
              href="/astrologers?view=map" 
              onClick={() => vibrate()}
              className="text-orange-600 hover:text-orange-700 font-semibold text-xs sm:text-sm flex items-center gap-1"
            >
              View All <i className="fas fa-arrow-right"></i>
            </Link>
          </div>

          {/* OpenStreetMap Preview */}
          <div className="mb-4 rounded-2xl overflow-hidden shadow-xl h-44 sm:h-52 relative">
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${userLng - 0.1},${userLat - 0.1},${userLng + 0.1},${userLat + 0.1}&layer=mapnik&marker=${userLat},${userLng}`}
            ></iframe>
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-xl border border-orange-100">
              <p className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <i className="fas fa-location-dot text-orange-600"></i>
                {userCity}
              </p>
            </div>
          </div>

          {/* Astrologer Cards - Horizontal Scroll */}
          {loadingAstrologers ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
            </div>
          ) : nearbyAstrologers.length > 0 ? (
            <div className="overflow-x-auto pb-4 -mx-3 px-3 scrollbar-hide">
              <div className="flex gap-3" style={{ width: "max-content" }}>
                {nearbyAstrologers.map((astrologer) => {
                  const sessionRate = parseRate(
                    astrologer.rate_session_per_minute ?? astrologer.price_per_session,
                  )
                  const videoRate = parseRate(astrologer.rate_video_per_minute)
                  const chatRate = parseRate(astrologer.rate_chat_per_minute)
                  const sessionRateLabel =
                    sessionRate !== null ? `₹${sessionRate.toFixed(0)}/min` : null

                  return (
                    <Card
                      key={astrologer.id}
                      className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group active:scale-95 min-w-[260px] sm:min-w-[280px] border border-gray-100"
                      onClick={() => {
                        vibrate()
                        router.push(`/astrologer/${astrologer.id}`)
                      }}
                    >
                      <div className="relative h-36 sm:h-40 overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100">
                        <img
                          src={astrologer.avatar_url || PLACEHOLDER_IMAGE}
                          alt={astrologer.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = PLACEHOLDER_IMAGE
                          }}
                        />
                        <div className="absolute top-2 right-2 bg-orange-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                          <i className="fas fa-star text-xs"></i>
                          {Number(astrologer.rating).toFixed(1)}
                        </div>
                      </div>
                      <div className="p-3 sm:p-4">
                        <h4 className="font-bold text-base sm:text-lg mb-1.5">{astrologer.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 flex items-center gap-1">
                          <i className="fas fa-map-marker-alt text-orange-600 text-xs"></i>
                          {astrologer.location || "Location not specified"}
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <i
                                key={i}
                                className={`fas fa-star text-xs ${
                                  i < Math.floor(Number(astrologer.rating))
                                    ? "text-yellow-500"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">({astrologer.review_count || 0})</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2.5">
                          {(astrologer.specializations || []).slice(0, 2).map((spec: string) => (
                            <span
                              key={spec}
                              className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                        <div className="space-y-1">
                          {sessionRateLabel ? (
                            <p className="text-base sm:text-lg font-bold text-orange-600">
                              {sessionRateLabel}{" "}
                              <span className="text-xs font-semibold text-gray-500">(Session)</span>
                            </p>
                          ) : (
                            <p className="text-xs font-semibold text-gray-500">
                              Session rate not available
                            </p>
                          )}
                          {(videoRate || chatRate) && (
                            <div className="flex flex-wrap gap-2 text-xs text-gray-600 font-medium">
                              {videoRate && (
                                <span className="px-2 py-1 bg-orange-50 border border-orange-100 rounded-full">
                                  Video ₹{videoRate.toFixed(0)}/min
                                </span>
                              )}
                              {chatRate && (
                                <span className="px-2 py-1 bg-orange-50 border border-orange-100 rounded-full">
                                  Chat ₹{chatRate.toFixed(0)}/min
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl p-8">
              <i className="fas fa-user-astronaut text-5xl mb-3 block text-gray-300"></i>
              <p className="font-semibold">No astrologers available</p>
              <p className="text-sm text-gray-400 mt-1">Check back later</p>
            </div>
          )}
        </section>

        {/* 3. Categories - Circular Carousel */}
        <section className="mb-6">
          <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
            <i className="fas fa-th-large text-orange-600 text-xl"></i> 
            <span>Categories</span>
          </h3>
          <div className="overflow-x-auto pb-4 -mx-3 px-3 scrollbar-hide">
            <div className="flex gap-3 sm:gap-4" style={{ width: "max-content" }}>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/astrologers?category=${category.name}`}
                  onClick={() => vibrate()}
                  className="group relative flex flex-col items-center gap-2 min-w-[90px] sm:min-w-[100px] active:scale-95 transition-transform"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all group-hover:scale-110 border-2 border-orange-300">
                    <i className={`fas ${category.icon || "fa-star"} text-white text-xl sm:text-2xl`}></i>
                  </div>
                  <span className="font-semibold text-gray-900 text-xs sm:text-sm text-center leading-tight">{category.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Offers & Promotions */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <i className="fas fa-tags text-orange-600 text-xl"></i> 
              <span>Offers & Promotions</span>
            </h3>
            <Link 
              href="/offers" 
              onClick={() => vibrate()}
              className="text-orange-600 hover:text-orange-700 font-semibold text-xs sm:text-sm flex items-center gap-1"
            >
              View All <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          <div className="overflow-x-auto pb-4 -mx-3 px-3 scrollbar-hide">
            <div className="flex gap-3" style={{ width: "max-content" }}>
              {offers.map((offer) => (
                <Card
                  key={offer.id}
                  className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group active:scale-95 min-w-[280px] sm:min-w-[300px] border border-gray-100"
                  onClick={() => vibrate()}
                >
                  <div className="relative h-36 sm:h-40 overflow-hidden bg-gradient-to-br from-orange-50 to-pink-50">
                    <img
                      src={offer.image_url || PLACEHOLDER_IMAGE}
                      alt={offer.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = PLACEHOLDER_IMAGE
                      }}
                    />
                    {offer.discount_percent && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                        <i className="fas fa-percent text-xs"></i>
                        {offer.discount_percent}% OFF
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    <h4 className="font-bold text-base sm:text-lg mb-1.5">{offer.title}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">{offer.description}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        vibrate()
                      }}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-full font-semibold transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-gift"></i>
                      Claim Offer
                    </button>
            </div>
          </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Testimonials */}
        <section className="mb-6">
          <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
            <i className="fas fa-quote-left text-orange-600 text-xl"></i> 
            <span>What Our Users Say</span>
          </h3>
          <div className="overflow-x-auto pb-4 -mx-3 px-3 scrollbar-hide">
            <div className="flex gap-3" style={{ width: "max-content" }}>
              {testimonials.map((testimonial) => (
                <Card 
                  key={testimonial.id} 
                  className="p-4 sm:p-5 hover:shadow-lg transition-all duration-300 min-w-[280px] sm:min-w-[300px] border border-gray-100"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <img
                        src={testimonial.user_avatar_url || PLACEHOLDER_IMAGE}
                        alt={testimonial.user_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-orange-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = PLACEHOLDER_IMAGE
                        }}
                      />
                      <div className="absolute -bottom-1 -right-1 bg-orange-600 text-white rounded-full p-1">
                        <i className="fas fa-check text-xs"></i>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm sm:text-base">{testimonial.user_name}</h4>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <i
                            key={i}
                            className={`fas fa-star text-xs ${
                              i < testimonial.rating ? "text-yellow-500" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
              </div>
              </div>
                  <p className="text-xs sm:text-sm text-gray-700 mb-2 italic leading-relaxed">"{testimonial.review_text}"</p>
                  {testimonial.astrologer_name && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <i className="fas fa-user-astronaut text-orange-600"></i>
                      {testimonial.astrologer_name}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Trending/New Arrivals */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <i className="fas fa-fire text-orange-600 text-xl"></i> 
              <span>Trending Now</span>
            </h3>
            <Link 
              href="/ecommerce" 
              onClick={() => vibrate()}
              className="text-orange-600 hover:text-orange-700 font-semibold text-xs sm:text-sm flex items-center gap-1"
            >
              View All <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          <div className="overflow-x-auto pb-4 -mx-3 px-3 scrollbar-hide">
            <div className="flex gap-3" style={{ width: "max-content" }}>
              {trendingItems.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group active:scale-95 min-w-[200px] sm:min-w-[220px] border border-gray-100"
                  onClick={() => vibrate()}
                >
                  <div className="relative h-40 sm:h-48 overflow-hidden bg-gradient-to-br from-orange-50 to-yellow-50">
                    <img
                      src={item.image || PLACEHOLDER_IMAGE}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = PLACEHOLDER_IMAGE
                      }}
                    />
                    <div className="absolute top-2 left-2 bg-orange-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                      <i className="fas fa-fire text-xs"></i>
                      NEW
                    </div>
                  </div>
                  <div className="p-3 sm:p-4">
                    <h4 className="font-bold text-base sm:text-lg mb-2 line-clamp-1">{item.title}</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg sm:text-xl font-bold text-orange-600">₹{item.price}</span>
                      {item.originalPrice && (
                        <span className="text-xs sm:text-sm text-gray-500 line-through">₹{item.originalPrice}</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        vibrate()
                      }}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-full font-semibold transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-shopping-cart"></i>
                      Buy Now
                    </button>
            </div>
          </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Pooja Service Section */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <i className="fas fa-praying-hands text-orange-600 text-xl"></i> 
              <span>Pooja Services</span>
            </h3>
            <Link
              href="/pooja"
              onClick={() => vibrate()}
              className="text-orange-600 hover:text-orange-700 font-semibold text-xs sm:text-sm flex items-center gap-1"
            >
              View All <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          <Link
            href="/pooja"
            onClick={() => vibrate()}
            className="block rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all active:scale-[0.98]"
          >
            <div className="relative h-56 sm:h-64 overflow-hidden">
              <img
                src={PLACEHOLDER_IMAGE}
                alt="Book Your Pooja Service"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = PLACEHOLDER_IMAGE
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600/85 to-orange-500/70"></div>
              <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-5 sm:p-6 text-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 mb-3">
                  <i className="fas fa-praying-hands text-4xl sm:text-5xl"></i>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">Book Your Pooja Service</h3>
                <p className="text-sm sm:text-base mb-4 text-white/95">Get expert astrologers at your doorstep</p>
                <div className="bg-white text-orange-600 px-5 py-2.5 rounded-full font-bold text-sm sm:text-base shadow-xl flex items-center gap-2">
                  <i className="fas fa-calendar-check"></i>
                  Book Now
              </div>
              </div>
            </div>
          </Link>
        </section>

        {/* 8. E-commerce Section */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <i className="fas fa-shopping-bag text-orange-600 text-xl"></i> 
              <span>E-commerce</span>
            </h3>
            <Link
              href="/ecommerce"
              onClick={() => vibrate()}
              className="text-orange-600 hover:text-orange-700 font-semibold text-xs sm:text-sm flex items-center gap-1"
            >
              View All <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          <Link
            href="/ecommerce"
            onClick={() => vibrate()}
            className="block rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all active:scale-[0.98]"
          >
            <div className="relative h-56 sm:h-64 overflow-hidden">
              <img
                src={PLACEHOLDER_IMAGE}
                alt="E-commerce Shop"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = PLACEHOLDER_IMAGE
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600/85 to-orange-500/70"></div>
              <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-5 sm:p-6 text-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 mb-3">
                  <i className="fas fa-shopping-bag text-4xl sm:text-5xl"></i>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">Shop Now</h3>
                <p className="text-sm sm:text-base mb-4 text-white/95">Explore our collection of spiritual products</p>
                <div className="bg-white text-orange-600 px-5 py-2.5 rounded-full font-bold text-sm sm:text-base shadow-xl flex items-center gap-2">
                  <i className="fas fa-store"></i>
                  Browse Products
              </div>
              </div>
            </div>
          </Link>
        </section>

        {/* 9. Blogs/Info/Advice */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <i className="fas fa-book text-orange-600 text-xl"></i> 
              <span>Astrology Insights & Tips</span>
            </h3>
            <Link 
              href="/blogs" 
              onClick={() => vibrate()}
              className="text-orange-600 hover:text-orange-700 font-semibold text-xs sm:text-sm flex items-center gap-1"
            >
              Read More <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          <div className="overflow-x-auto pb-4 -mx-3 px-3 scrollbar-hide">
            <div className="flex gap-3" style={{ width: "max-content" }}>
              {blogPosts.map((post) => (
                <Card
                  key={post.id}
                  className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group active:scale-95 min-w-[280px] sm:min-w-[300px] border border-gray-100"
                  onClick={() => vibrate()}
                >
                  <div className="relative h-36 sm:h-40 overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50">
                    <img
                      src={post.image || PLACEHOLDER_IMAGE}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = PLACEHOLDER_IMAGE
                      }}
                    />
        </div>
                  <div className="p-3 sm:p-4">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <i className="fas fa-clock text-xs"></i>
                      {post.date}
                    </p>
                    <h4 className="font-bold text-base sm:text-lg mb-2 line-clamp-2">{post.title}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">{post.excerpt}</p>
                    <button className="text-orange-600 hover:text-orange-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                      Read More <i className="fas fa-arrow-right text-xs"></i>
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
