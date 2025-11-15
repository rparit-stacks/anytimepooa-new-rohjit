"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Review {
  id: string
  user_id: string
  rating: number
  review_text: string
  created_at: string
  user_avatar_url: string
  user_name: string
}

export default function ReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState({
    average_rating: 0,
    total_reviews: 0,
    rating_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const response = await fetch("/api/astrologer/profile/reviews")
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/astrologer-portal/login")
          return
        }
        throw new Error("Failed to fetch reviews")
      }

      const data = await response.json()
      setReviews(data.reviews || [])
      setStats(data.stats || stats)
    } catch (error) {
      console.error("Failed to fetch reviews:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredReviews = reviews.filter((review) => {
    if (filter !== "all" && review.rating !== parseInt(filter)) return false
    if (search && !review.review_text.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const getRatingPercentage = (rating: number) => {
    if (stats.total_reviews === 0) return 0
    return Math.round((stats.rating_breakdown[rating as keyof typeof stats.rating_breakdown] / stats.total_reviews) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-[#ff6f1e] text-5xl mb-4"></i>
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-24">
      <header className="bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/astrologer-portal/profile" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <i className="fas fa-arrow-left text-xl"></i>
          </Link>
          <h1 className="text-xl font-bold">Reviews & Ratings</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Rating Overview */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="text-center flex-1">
              <div className="text-5xl font-bold text-gray-900">{stats.average_rating.toFixed(1)}</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <i
                    key={i}
                    className={`fas fa-star ${
                      i < Math.floor(stats.average_rating) ? "text-yellow-400" : "text-gray-300"
                    }`}
                  ></i>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-2">{stats.total_reviews} reviews</p>
            </div>

            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 w-6">{rating}★</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{ width: `${getRatingPercentage(rating)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {getRatingPercentage(rating)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reviews..."
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>

        {/* Reviews List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fas fa-comments text-[#ff6f1e] mr-2"></i>
            Customer Reviews ({filteredReviews.length})
          </h3>

          {filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-star text-gray-300 text-6xl mb-4"></i>
              <p className="text-gray-600">No reviews found</p>
              <p className="text-sm text-gray-500">
                {search || filter !== "all" ? "Try changing your filters" : "You haven't received any reviews yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#ff6f1e] to-[#ff8c42] rounded-full flex items-center justify-center flex-shrink-0">
                      {review.user_avatar_url ? (
                        <img
                          src={review.user_avatar_url}
                          alt={review.user_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <i className="fas fa-user text-white"></i>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{review.user_name || "Anonymous"}</h4>
                        <span className="text-xs text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <i
                            key={i}
                            className={`fas fa-star text-sm ${
                              i < review.rating ? "text-yellow-400" : "text-gray-300"
                            }`}
                          ></i>
                        ))}
                      </div>

                      <p className="text-gray-700 text-sm">{review.review_text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
