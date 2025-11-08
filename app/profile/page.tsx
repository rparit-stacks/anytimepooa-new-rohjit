"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Edit2, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { vibrate } from "@/lib/vibration"
import { showToast } from "@/components/toast"

interface UserProfile {
  id: string
  email: string
  full_name: string
  phone: string
  location: string
  city: string
  bio: string
  avatar_url: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile")
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/auth/login")
            return
          }
        }
        if (response.ok) {
          const data = await response.json()
          setProfile(data.data)
          setFormData(data.data)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
      router.push("/auth/login")
    }
  }

  const handleSave = async () => {
    try {
      vibrate()
      const response = await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.data)
        setIsEditing(false)
        showToast("Profile updated successfully!", "success")
      } else {
        showToast("Failed to update profile. Please try again.", "error")
      }
    } catch (err) {
      console.error("Failed to update profile", err)
      showToast("Failed to update profile. Please try again.", "error")
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file", "error")
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("File size must be less than 5MB", "error")
      return
    }

    setUploadingAvatar(true)
    try {
      vibrate()
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/user/upload-avatar", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setProfile({ ...profile!, avatar_url: data.avatar_url })
        showToast("Profile picture updated successfully!", "success")
      } else {
        const error = await response.json()
        showToast(error.error || "Failed to upload image", "error")
      }
    } catch (err) {
      console.error("Failed to upload avatar:", err)
      showToast("Failed to upload image. Please try again.", "error")
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-orange-600" size={32} />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white safe-area">
        <div className="text-center">
          <p className="text-gray-600 font-semibold">Profile not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 pb-24 animate-fade-in relative overflow-x-hidden" style={{ paddingBottom: "6rem" }}>
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
        
        {/* Floating Icons */}
        <div className="absolute top-1/4 left-1/4 text-purple-400/20 animate-bounce" style={{ animationDuration: "3s" }}>
          <i className="fas fa-user-circle text-3xl"></i>
        </div>
        <div className="absolute top-1/3 right-1/4 text-pink-400/20 animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>
          <i className="fas fa-user-astronaut text-2xl"></i>
        </div>
        <div className="absolute bottom-1/3 left-1/3 text-blue-400/20 animate-bounce" style={{ animationDuration: "5s", animationDelay: "2s" }}>
          <i className="fas fa-id-card text-2xl"></i>
        </div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 p-4 bg-white border-b border-gray-200 safe-area-top animate-slide-down relative">
        <button
          onClick={() => {
            vibrate()
            router.back()
          }}
          className="text-gray-600 active:scale-95 transition-transform"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <button
          onClick={() => {
            vibrate()
            setIsEditing(!isEditing)
          }}
          className="ml-auto text-orange-600 hover:text-orange-700 active:scale-95 transition-transform"
        >
          <Edit2 size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 relative z-10">
        {/* Avatar & Name */}
        <div className="text-center animate-scale-in">
          <div className="relative inline-block">
            <div className="relative">
              <img
                src={profile.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80"}
                alt={profile.full_name}
                className="w-32 h-32 rounded-full object-cover mx-auto shadow-lg mb-4 border-4 border-orange-500/30"
              />
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <Loader2 className="animate-spin text-white" size={24} />
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-orange-600 transition-colors active:scale-95"
              >
                <i className="fas fa-camera"></i>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
          </div>
          {isEditing ? (
            <input
              type="text"
              value={formData.full_name || ""}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: "smooth", block: "center" })
                }, 300)
              }}
              className="w-full text-center text-2xl font-bold border border-gray-300 rounded-lg p-2 mb-2"
              placeholder="Full Name"
            />
          ) : (
            <h2 className="text-3xl font-bold text-gray-900">{profile.full_name}</h2>
          )}
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-2xl p-6 space-y-4 animate-slide-up">
          {/* Email */}
          <div className="flex items-center gap-3">
            <i className="fas fa-envelope text-orange-600 text-xl"></i>
            {isEditing ? (
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onFocus={(e) => {
                  setTimeout(() => {
                    e.target.scrollIntoView({ behavior: "smooth", block: "center" })
                  }, 300)
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Email"
              />
            ) : (
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-gray-900">{profile.email}</p>
              </div>
            )}
          </div>

          {/* Phone */}
          <div className="border-t border-gray-200 pt-4 flex items-center gap-3">
            <i className="fas fa-phone text-orange-600 text-xl"></i>
            {isEditing ? (
              <input
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                onFocus={(e) => {
                  setTimeout(() => {
                    e.target.scrollIntoView({ behavior: "smooth", block: "center" })
                  }, 300)
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Phone"
              />
            ) : (
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-semibold text-gray-900">{profile.phone || "Not provided"}</p>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="border-t border-gray-200 pt-4 flex items-start gap-3">
            <i className="fas fa-map-marker-alt text-orange-600 text-xl mt-1"></i>
            {isEditing ? (
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={formData.location || ""}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  onFocus={(e) => {
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: "smooth", block: "center" })
                    }, 300)
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Address"
                />
                <input
                  type="text"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  onFocus={(e) => {
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: "smooth", block: "center" })
                    }, 300)
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="City"
                />
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold text-gray-900">{profile.location || "Not provided"}</p>
                <p className="text-sm text-gray-600">{profile.city || "Not provided"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl p-4 space-y-2 shadow-lg">
          <Link
            href="/wallet"
            onClick={() => vibrate()}
            className="flex items-center justify-between p-3 hover:bg-orange-50 rounded-lg transition-all hover:scale-105"
          >
            <span className="font-semibold text-gray-900 flex items-center gap-2">
              <i className="fas fa-wallet text-orange-600"></i> My Wallet
            </span>
            <i className="fas fa-chevron-right text-gray-400"></i>
          </Link>
          <Link
            href="/bookings"
            onClick={() => vibrate()}
            className="flex items-center justify-between p-3 hover:bg-orange-50 rounded-lg transition-all hover:scale-105"
          >
            <span className="font-semibold text-gray-900 flex items-center gap-2">
              <i className="fas fa-calendar-alt text-orange-600"></i> My Bookings
            </span>
            <i className="fas fa-chevron-right text-gray-400"></i>
          </Link>
          <Link
            href="/horoscope"
            onClick={() => vibrate()}
            className="flex items-center justify-between p-3 hover:bg-orange-50 rounded-lg transition-all hover:scale-105"
          >
            <span className="font-semibold text-gray-900 flex items-center gap-2">
              <i className="fas fa-star-and-crescent text-orange-600"></i> Check Horoscope
            </span>
            <i className="fas fa-chevron-right text-gray-400"></i>
          </Link>
          <Link
            href="/ecommerce"
            onClick={() => vibrate()}
            className="flex items-center justify-between p-3 hover:bg-orange-50 rounded-lg transition-all hover:scale-105"
          >
            <span className="font-semibold text-gray-900 flex items-center gap-2">
              <i className="fas fa-shopping-bag text-orange-600"></i> Checkout Our Store
            </span>
            <i className="fas fa-chevron-right text-gray-400"></i>
          </Link>
          <Link
            href="/section-chooser"
            onClick={() => vibrate()}
            className="flex items-center justify-between p-3 hover:bg-orange-50 rounded-lg transition-all hover:scale-105"
          >
            <span className="font-semibold text-gray-900 flex items-center gap-2">
              <i className="fas fa-exchange-alt text-orange-600"></i> Switch Section
            </span>
            <i className="fas fa-chevron-right text-gray-400"></i>
          </Link>
        </div>

        {/* Action Buttons */}
        {isEditing ? (
          <div className="flex gap-3">
            <button
              onClick={() => {
                vibrate()
                handleSave()
              }}
              className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-full hover:bg-orange-700 transition-all active:scale-95"
            >
              Save Changes
            </button>
            <button
              onClick={() => {
                vibrate()
                setIsEditing(false)
                setFormData(profile || {})
                showToast("Changes cancelled", "info")
              }}
              className="flex-1 py-3 bg-gray-200 text-gray-900 font-bold rounded-full hover:bg-gray-300 transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        ) : null}

        {/* Logout Button */}
        <button
          onClick={() => {
            vibrate()
            handleLogout()
          }}
          className="w-full py-4 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg"
        >
          <i className="fas fa-sign-out-alt"></i> Sign Out
        </button>
      </div>

    </div>
  )
}
