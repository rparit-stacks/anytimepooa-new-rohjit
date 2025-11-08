"use client"

import { useEffect, useState } from "react"
import { getClient } from "@/lib/client"
import { useRouter, useParams } from "next/navigation"
import { Star, MapPin, Loader2, ArrowLeft } from "lucide-react"

interface Astrologer {
  id: string
  name: string
  avatar_url: string
  bio: string
  specializations: string[]
  rating: number
  review_count: number
  location: string
  price_per_session: number
  languages: string[]
}

export default function AstrologerProfilePage() {
  const router = useRouter()
  const params = useParams()
  const supabase = getClient()
  const [astrologer, setAstrologer] = useState<Astrologer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAstrologer = async () => {
      try {
        const response = await fetch(`/api/astrologers/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setAstrologer(data.data)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAstrologer()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-orange-600" size={32} />
      </div>
    )
  }

  if (!astrologer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white safe-area">
        <div className="text-center">
          <p className="text-gray-600 font-semibold">Astrologer not found</p>
          <button onClick={() => router.back()} className="text-orange-600 mt-4 font-semibold">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 safe-area pb-20 animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 p-4 bg-white border-b border-gray-200 safe-area-top animate-slide-down">
        <button onClick={() => router.back()} className="text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
      </div>

      {/* Profile Content */}
      <div className="p-6 space-y-6">
        {/* Avatar & Name */}
        <div className="text-center animate-scale-in">
          <img
            src={astrologer.avatar_url || "/placeholder.svg?height=120&width=120&query=astrologer"}
            alt={astrologer.name}
            className="w-32 h-32 rounded-full object-cover mx-auto shadow-lg mb-4"
          />
          <h2 className="text-3xl font-bold text-gray-900">{astrologer.name}</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Star className="text-yellow-500 fill-yellow-500" size={20} />
            <span className="text-lg font-semibold">{astrologer.rating}</span>
            <span className="text-gray-600">({astrologer.review_count} reviews)</span>
          </div>
        </div>

        {/* Location & Price */}
        <div className="bg-white rounded-2xl p-4 space-y-3 animate-slide-up">
          <div className="flex items-center gap-3">
            <MapPin className="text-orange-600" size={20} />
            <span className="text-gray-700">{astrologer.location}</span>
          </div>
          <div className="border-t border-gray-200 pt-3">
            <p className="text-sm text-gray-600">Session Price</p>
            <p className="text-2xl font-bold text-orange-600">₹{astrologer.price_per_session}</p>
          </div>
        </div>

        {/* Bio */}
        {astrologer.bio && (
          <div className="bg-white rounded-2xl p-4 animate-slide-up">
            <h3 className="font-bold text-gray-900 mb-2">About</h3>
            <p className="text-gray-700 leading-relaxed">{astrologer.bio}</p>
          </div>
        )}

        {/* Specializations */}
        <div className="bg-white rounded-2xl p-4 animate-slide-up">
          <h3 className="font-bold text-gray-900 mb-3">Specializations</h3>
          <div className="flex flex-wrap gap-2">
            {astrologer.specializations?.map((spec) => (
              <span key={spec} className="px-4 py-2 bg-orange-100 text-orange-700 rounded-full font-semibold">
                {spec}
              </span>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="bg-white rounded-2xl p-4 animate-slide-up">
          <h3 className="font-bold text-gray-900 mb-3">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {astrologer.languages?.map((lang) => (
              <span key={lang} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {lang}
              </span>
            ))}
          </div>
        </div>

        {/* Book Button */}
        <button className="w-full py-4 bg-orange-600 text-white font-bold rounded-full hover:bg-orange-700 transition-all text-lg shadow-lg animate-slide-up">
          Book a Session
        </button>
      </div>
    </div>
  )
}
