"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Astrologer {
  id: string
  name: string
  email: string
  phone: string
  specialization: string
  specializations: string[]
  experience_years: number
  languages: string[]
  rate_per_session: number
  rate_video_per_minute: number
  rate_session_per_minute: number
  rate_chat_per_minute: number
  bio: string
  location: string
  city: string
  state: string
  country: string
  profile_picture_url?: string
  rating?: number
  total_reviews?: number
  status: string
  is_available: boolean
  created_at: string
}

const SPECIALIZATIONS = [
  "Vedic Astrology",
  "Numerology",
  "Tarot Reading",
  "Palmistry",
  "Vastu",
  "Horoscope",
  "KP Astrology",
  "Nadi Astrology",
  "Face Reading",
  "Gemology"
]

const LANGUAGES = [
  "Hindi",
  "English",
  "Bengali",
  "Telugu",
  "Marathi",
  "Tamil",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Odia",
  "Assamese"
]

export default function AstrologerProfilePage() {
  const router = useRouter()
  const [astrologer, setAstrologer] = useState<Astrologer | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [togglingAvailability, setTogglingAvailability] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    specialization: "",
    specializations: [] as string[],
    experience_years: "",
    languages: [] as string[],
    rate_per_session: "",
    rate_video_per_minute: "",
    rate_session_per_minute: "",
    rate_chat_per_minute: "",
    bio: "",
    location: "",
    city: "",
    state: "",
    country: "India",
  })

  useEffect(() => {
    fetchProfile()
    fetchProfileCompletion()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/astrologer/auth/me")
      if (!response.ok) {
        router.push("/astrologer-portal/login")
        return
      }

      const data = await response.json()
      const astro = data.astrologer
      setAstrologer(astro)

      // Handle array fields properly
      const languagesArray = Array.isArray(astro.languages)
        ? astro.languages
        : (astro.languages ? [astro.languages] : [])

      const specializationsArray = Array.isArray(astro.specializations)
        ? astro.specializations
        : (astro.specialization ? [astro.specialization] : [])

      setFormData({
        name: astro.name || "",
        phone: astro.phone || "",
        specialization: astro.specialization || "",
        specializations: specializationsArray,
        experience_years: astro.experience_years?.toString() || "",
        languages: languagesArray,
        rate_per_session: astro.rate_per_session?.toString() || "",
        rate_video_per_minute: astro.rate_video_per_minute?.toString() || "",
        rate_session_per_minute: astro.rate_session_per_minute?.toString() || "",
        rate_chat_per_minute: astro.rate_chat_per_minute?.toString() || "",
        bio: astro.bio || "",
        location: astro.location || "",
        city: astro.city || "",
        state: astro.state || "",
        country: astro.country || "India",
      })
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProfileCompletion = async () => {
    try {
      const response = await fetch("/api/astrologer/profile/completion")
      if (response.ok) {
        const data = await response.json()
        setProfileCompletion(data.completion || 0)
      }
    } catch (error) {
      console.error("Failed to fetch profile completion:", error)
    }
  }

  const handleSave = async () => {
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const response = await fetch("/api/astrologer/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to update profile")
        setSaving(false)
        return
      }

      setSuccess("Profile updated successfully!")
      setEditing(false)
      await fetchProfile()
      await fetchProfileCompletion()
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailability = async () => {
    if (!astrologer) return

    setTogglingAvailability(true)
    try {
      const response = await fetch("/api/astrologer/profile/toggle-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: !astrologer.is_available }),
      })

      const data = await response.json()

      if (response.ok) {
        setAstrologer({ ...astrologer, is_available: data.is_available })
        setSuccess(data.is_available ? "You are now available!" : "You are now unavailable")
      } else {
        setError(data.error || "Failed to update availability")
      }
    } catch (err) {
      setError("Failed to update availability")
    } finally {
      setTogglingAvailability(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file")
      return
    }

    const formData = new FormData()
    formData.append("image", file)

    try {
      const response = await fetch("/api/astrologer/profile/upload-picture", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Profile picture updated!")
        fetchProfile()
        fetchProfileCompletion()
      } else {
        setError(data.error || "Failed to upload image")
      }
    } catch (err: any) {
      setError("Failed to upload image")
    }
  }

  const toggleLanguage = (lang: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }))
  }

  const toggleSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center pb-24">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-[#ff6f1e] text-5xl mb-4"></i>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!astrologer) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/astrologer-portal/dashboard"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <i className="fas fa-arrow-left text-xl"></i>
          </Link>
          <h1 className="text-xl font-bold">My Profile</h1>
          <button
            onClick={() => {
              if (editing) {
                setEditing(false)
                setError("")
                setSuccess("")
              } else {
                setEditing(true)
              }
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <i className={`fas ${editing ? "fa-times" : "fa-edit"} text-xl`}></i>
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Completion */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-bold">Profile Completion</h3>
              <p className="text-sm text-white/80">Complete your profile to get more bookings</p>
            </div>
            <div className="text-4xl font-bold">{profileCompletion}%</div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${profileCompletion}%` }}
            ></div>
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <i className={`fas fa-circle ${astrologer.is_available ? 'text-green-500' : 'text-red-500'} animate-pulse`}></i>
                Availability Status
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {astrologer.is_available ? "You are currently available for bookings" : "You are currently unavailable"}
              </p>
            </div>
            <button
              onClick={toggleAvailability}
              disabled={togglingAvailability}
              className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${
                astrologer.is_available ? "bg-green-500" : "bg-gray-300"
              } ${togglingAvailability ? "opacity-50" : ""}`}
            >
              <span
                className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform ${
                  astrologer.is_available ? "translate-x-12" : "translate-x-1"
                }`}
              >
                {togglingAvailability && (
                  <i className="fas fa-spinner fa-spin text-gray-500 flex items-center justify-center h-full"></i>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/astrologer-portal/profile/schedule"
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <i className="fas fa-calendar-alt text-blue-500 text-2xl mb-2"></i>
            <h4 className="font-semibold text-gray-900">Schedule</h4>
            <p className="text-xs text-gray-600">Set your working hours</p>
          </Link>

          <Link
            href="/astrologer-portal/profile/bank-details"
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <i className="fas fa-university text-green-500 text-2xl mb-2"></i>
            <h4 className="font-semibold text-gray-900">Bank Details</h4>
            <p className="text-xs text-gray-600">Manage payment info</p>
          </Link>

          <Link
            href="/astrologer-portal/profile/documents"
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <i className="fas fa-file-upload text-purple-500 text-2xl mb-2"></i>
            <h4 className="font-semibold text-gray-900">Documents</h4>
            <p className="text-xs text-gray-600">Upload certificates</p>
          </Link>

          <Link
            href="/astrologer-portal/profile/reviews"
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <i className="fas fa-star text-yellow-500 text-2xl mb-2"></i>
            <h4 className="font-semibold text-gray-900">Reviews</h4>
            <p className="text-xs text-gray-600">View your ratings</p>
          </Link>
        </div>

        {/* Profile Picture */}
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="relative inline-block mb-4">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[#ff6f1e] to-[#ff8c42] rounded-full shadow-xl flex items-center justify-center overflow-hidden">
              {astrologer.profile_picture_url ? (
                <img
                  src={astrologer.profile_picture_url}
                  alt={astrologer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <i className="fas fa-user text-white text-5xl"></i>
              )}
            </div>
            <label
              htmlFor="profile-picture"
              className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors border-2 border-[#ff6f1e]"
            >
              <i className="fas fa-camera text-[#ff6f1e]"></i>
            </label>
            <input
              id="profile-picture"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <h2 className="text-2xl font-bold text-gray-900">{astrologer.name}</h2>
          <p className="text-gray-600">{astrologer.specialization || "Astrologer"}</p>

          {astrologer.rating && astrologer.rating > 0 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <i
                    key={i}
                    className={`fas fa-star text-sm ${
                      i < Math.floor(astrologer.rating || 0)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                  ></i>
                ))}
              </div>
              <span className="text-gray-600">
                {astrologer.rating.toFixed(1)} ({astrologer.total_reviews} reviews)
              </span>
            </div>
          )}

          <div className="mt-4">
            <span
              className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                astrologer.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              <i
                className={`fas ${
                  astrologer.status === "active" ? "fa-check-circle" : "fa-clock"
                } mr-2`}
              ></i>
              {astrologer.status === "active" ? "Active" : "Pending Approval"}
            </span>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <i className="fas fa-check-circle text-green-500 mt-0.5"></i>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fas fa-info-circle text-[#ff6f1e] mr-2"></i>
            Basic Information
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
            {editing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
              />
            ) : (
              <p className="px-4 py-3 bg-gray-50 rounded-xl">{astrologer.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-500">{astrologer.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
            {editing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                maxLength={10}
              />
            ) : (
              <p className="px-4 py-3 bg-gray-50 rounded-xl">+91 {astrologer.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience *</label>
            {editing ? (
              <input
                type="number"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                min="0"
              />
            ) : (
              <p className="px-4 py-3 bg-gray-50 rounded-xl">
                {astrologer.experience_years || "Not specified"} years
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bio/About *</label>
            {editing ? (
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e] resize-none"
                placeholder="Tell users about your expertise and experience..."
              />
            ) : (
              <p className="px-4 py-3 bg-gray-50 rounded-xl">{astrologer.bio || "No bio added"}</p>
            )}
          </div>
        </div>

        {/* Specializations */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fas fa-star text-[#ff6f1e] mr-2"></i>
            Specializations *
          </h3>

          {editing ? (
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATIONS.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleSpecialization(spec)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    formData.specializations.includes(spec)
                      ? "bg-[#ff6f1e] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {spec}
                  {formData.specializations.includes(spec) && (
                    <i className="fas fa-check ml-2"></i>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(astrologer.specializations && astrologer.specializations.length > 0)
                ? astrologer.specializations.map((spec) => (
                    <span
                      key={spec}
                      className="px-4 py-2 bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] text-white rounded-full text-sm font-medium"
                    >
                      {spec}
                    </span>
                  ))
                : <p className="text-gray-500">No specializations added</p>}
            </div>
          )}
        </div>

        {/* Languages */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fas fa-language text-[#ff6f1e] mr-2"></i>
            Languages Known *
          </h3>

          {editing ? (
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    formData.languages.includes(lang)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {lang}
                  {formData.languages.includes(lang) && (
                    <i className="fas fa-check ml-2"></i>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(astrologer.languages && astrologer.languages.length > 0)
                ? astrologer.languages.map((lang) => (
                    <span
                      key={lang}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {lang}
                    </span>
                  ))
                : <p className="text-gray-500">No languages added</p>}
            </div>
          )}
        </div>

        {/* Rate Management */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fas fa-rupee-sign text-[#ff6f1e] mr-2"></i>
            Rate Management
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fas fa-video text-red-500 mr-2"></i>
                Video Call (₹/min)
              </label>
              {editing ? (
                <input
                  type="number"
                  value={formData.rate_video_per_minute}
                  onChange={(e) => setFormData({ ...formData, rate_video_per_minute: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  min="0"
                  placeholder="e.g., 50"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">
                  ₹{astrologer.rate_video_per_minute || "Not set"}/min
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fas fa-phone text-green-500 mr-2"></i>
                Voice Call (₹/min)
              </label>
              {editing ? (
                <input
                  type="number"
                  value={formData.rate_session_per_minute}
                  onChange={(e) => setFormData({ ...formData, rate_session_per_minute: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  min="0"
                  placeholder="e.g., 30"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">
                  ₹{astrologer.rate_session_per_minute || "Not set"}/min
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fas fa-comment text-blue-500 mr-2"></i>
                Chat (₹/min)
              </label>
              {editing ? (
                <input
                  type="number"
                  value={formData.rate_chat_per_minute}
                  onChange={(e) => setFormData({ ...formData, rate_chat_per_minute: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  min="0"
                  placeholder="e.g., 20"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">
                  ₹{astrologer.rate_chat_per_minute || "Not set"}/min
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fas fa-clock text-purple-500 mr-2"></i>
                Per Session Rate (₹)
              </label>
              {editing ? (
                <input
                  type="number"
                  value={formData.rate_per_session}
                  onChange={(e) => setFormData({ ...formData, rate_per_session: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  min="0"
                  placeholder="e.g., 500"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">
                  ₹{astrologer.rate_per_session || "Not set"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fas fa-map-marker-alt text-[#ff6f1e] mr-2"></i>
            Location
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  placeholder="e.g., Mumbai"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">{astrologer.city || "Not specified"}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  placeholder="e.g., Maharashtra"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">{astrologer.state || "Not specified"}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Address</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  placeholder="Enter your full address"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">{astrologer.location || "Not specified"}</p>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        {editing && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] hover:from-[#ff5f0e] hover:to-[#ff7c32] text-white font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-spinner fa-spin"></i>
                Saving Changes...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-save"></i>
                Save All Changes
              </span>
            )}
          </button>
        )}

        {/* Account Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fas fa-calendar text-[#ff6f1e] mr-2"></i>
            Account Information
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Member Since</span>
              <span className="font-medium text-gray-900">
                {new Date(astrologer.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Account ID</span>
              <span className="font-mono text-xs text-gray-500">
                {astrologer.id.slice(0, 8)}...
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Account Status</span>
              <span className={`font-medium ${astrologer.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                {astrologer.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
        <div className="flex justify-around items-center h-20 px-2 max-w-full">
          <Link
            href="/astrologer-portal/dashboard"
            className="flex flex-col items-center gap-1 transition-all text-gray-600 hover:text-[#ff6f1e]"
          >
            <i className="fas fa-home text-xl"></i>
            <span className="text-xs">Home</span>
          </Link>

          <Link
            href="/astrologer-portal/bookings"
            className="flex flex-col items-center gap-1 transition-all text-gray-600 hover:text-[#ff6f1e]"
          >
            <i className="fas fa-calendar text-xl"></i>
            <span className="text-xs">Bookings</span>
          </Link>

          <Link
            href="/astrologer-portal/services"
            className="flex flex-col items-center gap-1 transition-all text-gray-600 hover:text-[#ff6f1e]"
          >
            <i className="fas fa-om text-xl"></i>
            <span className="text-xs">Services</span>
          </Link>

          <Link
            href="/astrologer-portal/wallet"
            className="flex flex-col items-center gap-1 transition-all text-gray-600 hover:text-[#ff6f1e]"
          >
            <i className="fas fa-wallet text-xl"></i>
            <span className="text-xs">Wallet</span>
          </Link>

          <Link
            href="/astrologer-portal/profile"
            className="flex flex-col items-center gap-1 transition-all text-[#ff6f1e] font-semibold"
          >
            <i className="fas fa-user text-xl animate-pulse"></i>
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
