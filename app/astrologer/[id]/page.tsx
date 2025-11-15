"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Star, MapPin, Loader2, ArrowLeft, CalendarDays, Clock } from "lucide-react"
import { TimeSlotDropdown } from "@/components/TimeSlotDropdown"

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

interface AvailabilitySlot {
  id: string
  astrologer_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  is_active: boolean | null
  notes: string | null
}

interface Astrologer {
  id: string
  name: string
  avatar_url: string
  bio: string
  specializations: string[]
  rating: number
  review_count: number
  location: string
  price_per_session?: number | null
  rate_session_per_minute?: number | null
  rate_video_per_minute?: number | null
  rate_chat_per_minute?: number | null
  languages?: string[]
  availability?: AvailabilitySlot[]
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const

function timeStringToMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":")
  return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10)
}

function minutesToTimeString(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

function buildSlotsForDay(date: string, availability: AvailabilitySlot[] = []) {
  if (!date) return []
  const parsedDate = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) return []
  const day = parsedDate.getDay()

  const matchingSlots = availability.filter((slot) => slot.day_of_week === day && slot.is_active !== false)
  const results: string[] = []

  for (const slot of matchingSlots) {
    const duration = slot.slot_duration_minutes || 30
    let start = timeStringToMinutes(slot.start_time)
    const end = timeStringToMinutes(slot.end_time)

    while (start + duration <= end) {
      results.push(minutesToTimeString(start))
      start += duration
    }
  }

  return Array.from(new Set(results)).sort()
}

export default function AstrologerProfilePage() {
  const router = useRouter()
  const params = useParams()
  const [astrologer, setAstrologer] = useState<Astrologer | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedSlot, setSelectedSlot] = useState("")
  const [sessionType, setSessionType] = useState<"chat" | "voice" | "video">("chat")
  const [duration, setDuration] = useState(15)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [isBooking, setIsBooking] = useState(false)

  useEffect(() => {
    const fetchAstrologer = async () => {
      try {
        const [astrologerResponse, walletResponse] = await Promise.all([
          fetch(`/api/astrologers/${params.id}`),
          fetch("/api/wallet/balance"),
        ])

        if (astrologerResponse.ok) {
          const data = await astrologerResponse.json()
          const payload = data.data || {}
          setAstrologer({
            ...payload,
            price_per_session: toNumber(payload?.price_per_session),
            rate_session_per_minute: toNumber(payload?.rate_session_per_minute),
            rate_video_per_minute: toNumber(payload?.rate_video_per_minute),
            rate_chat_per_minute: toNumber(payload?.rate_chat_per_minute),
            languages: Array.isArray(payload?.languages)
              ? payload.languages
              : typeof payload?.languages === "string" && payload.languages.length > 0
                ? payload.languages.split(",").map((lang: string) => lang.trim())
                : [],
            availability: (payload?.availability || []).map((slot: AvailabilitySlot) => ({
              ...slot,
              slot_duration_minutes: slot.slot_duration_minutes || 30,
            })),
          })
        }

        if (walletResponse.ok) {
          const walletData = await walletResponse.json()
          setWalletBalance(walletData.balance || 0)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAstrologer()
  }, [params.id])

  const computedSlots = useMemo(() => {
    if (!astrologer || !selectedDate) return []
    return buildSlotsForDay(selectedDate, astrologer.availability)
  }, [astrologer, selectedDate])

  useEffect(() => {
    // Reset selected slot when date changes
    setSelectedSlot("")
  }, [selectedDate])

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

  const hasAvailability = Boolean(astrologer.availability && astrologer.availability.length > 0)
  const sessionRate = toNumber(astrologer.rate_session_per_minute ?? astrologer.price_per_session)
  const videoRate = toNumber(astrologer.rate_video_per_minute)
  const chatRate = toNumber(astrologer.rate_chat_per_minute)
  const rateChips = [
    { label: "Voice", value: sessionRate },
    { label: "Video", value: videoRate },
    { label: "Chat", value: chatRate },
  ].filter((chip): chip is { label: string; value: number } => chip.value !== null)

  // Calculate current session rate and total amount
  const getCurrentRate = () => {
    switch (sessionType) {
      case "chat":
        return chatRate || 0
      case "voice":
        return sessionRate || 0
      case "video":
        return videoRate || 0
      default:
        return 0
    }
  }

  const currentRate = getCurrentRate()
  const totalAmount = currentRate * duration
  const canAfford = walletBalance !== null && walletBalance >= totalAmount
  const sessionRateLabel = currentRate > 0 ? `₹${currentRate.toFixed(0)}/min` : "Rate not provided"

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 safe-area pb-20 animate-fade-in overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 p-4 bg-white/95 backdrop-blur border-b border-gray-200 safe-area-top animate-slide-down">
        <button onClick={() => router.back()} className="text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
      </div>

      {/* Profile Content */}
      <div className="p-6 space-y-6 pb-32">
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
            <p className="text-sm text-gray-600 mb-2">Rates (per minute)</p>
            {rateChips.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {rateChips.map((chip) => (
                  <span
                    key={chip.label}
                    className="px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-700 font-semibold text-sm"
                  >
                    {chip.label} ₹{chip.value.toFixed(0)}/min
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Rates not available.</p>
            )}
          </div>
        </div>

        {/* Availability Summary */}
        <div className="bg-white rounded-2xl p-4 animate-slide-up">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <CalendarDays className="text-orange-600" size={20} />
            Availability
          </h3>
          {hasAvailability ? (
            <ul className="space-y-2">
              {Array.from(
                new Map(
                  (astrologer.availability || []).map((slot) => {
                    const dayName = DAY_NAMES[slot.day_of_week]
                    const label = `${dayName}: ${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`
                    return [`${slot.day_of_week}-${slot.start_time}-${slot.end_time}`, label]
                  }),
                ).values(),
              ).map((label) => (
                <li key={label} className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock className="text-orange-500" size={16} />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">Astrologer timings not available.</p>
          )}
        </div>

        {/* Bio */}
        {astrologer.bio && (
          <div className="bg-white rounded-2xl p-4 animate-slide-up">
            <h3 className="font-bold text-gray-900 mb-2">About</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{astrologer.bio}</p>
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
        <button
          onClick={() => setIsBookingOpen(true)}
          className="w-full py-4 bg-orange-600 text-white font-bold rounded-full hover:bg-orange-700 transition-all text-lg shadow-lg animate-slide-up active:scale-[0.98]"
        >
          Book a Session
        </button>
      </div>

      {/* Booking Modal */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Book Session</h2>
                <p className="text-sm text-gray-500">
                  {astrologer.name} · Session rate: {sessionRateLabel}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsBookingOpen(false)
                  setSelectedDate("")
                  setSelectedSlot("")
                  setSessionType("chat")
                  setDuration(15)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close booking dialog"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Wallet Balance Display */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Wallet Balance</span>
                  <span className="text-lg font-bold text-orange-600">
                    ₹{walletBalance !== null ? walletBalance.toFixed(2) : "Loading..."}
                  </span>
                </div>
              </div>

              {/* Session Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Session Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: "chat" as const, label: "Chat", rate: chatRate, icon: "💬" },
                    { type: "voice" as const, label: "Voice", rate: sessionRate, icon: "📞" },
                    { type: "video" as const, label: "Video", rate: videoRate, icon: "📹" },
                  ].map(({ type, label, rate, icon }) => (
                    <button
                      key={type}
                      onClick={() => setSessionType(type)}
                      disabled={!rate || rate <= 0}
                      className={`px-3 py-3 rounded-xl border text-sm font-semibold transition-all ${
                        sessionType === type
                          ? "bg-orange-600 border-orange-600 text-white shadow-lg"
                          : rate && rate > 0
                            ? "border-gray-200 text-gray-700 hover:border-orange-400"
                            : "border-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                      }`}
                    >
                      <div className="text-xl mb-1">{icon}</div>
                      <div>{label}</div>
                      {rate && rate > 0 && <div className="text-xs mt-1">₹{rate.toFixed(0)}/min</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duration: {duration} minutes
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                  <div className="flex gap-2">
                    {[15, 20, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setDuration(mins)}
                        className={`flex-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                          duration === mins
                            ? "bg-orange-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Calculation */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Rate per minute</span>
                  <span className="font-semibold">₹{currentRate.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-semibold">{duration} minutes</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                  <span className="font-bold text-gray-900">Total Amount</span>
                  <span className="text-xl font-bold text-orange-600">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Choose a date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                {selectedDate ? (
                  <TimeSlotDropdown
                    selectedTime={selectedSlot}
                    onChange={setSelectedSlot}
                    astrologerId={astrologer.id}
                    selectedDate={selectedDate}
                  />
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Available time slots</label>
                    <p className="text-sm text-gray-500">Pick a date to see available times.</p>
                  </div>
                )}
              </div>

              {hasAvailability === false && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-3">
                  Astrologer timings not available. Please contact support for manual booking.
                </p>
              )}

              {/* Insufficient Balance Warning */}
              {!canAfford && walletBalance !== null && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-3">
                  <p className="text-sm text-red-700 font-semibold">
                    Insufficient balance. Please recharge your wallet.
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Required: ₹{totalAmount.toFixed(2)} | Available: ₹{walletBalance.toFixed(2)}
                  </p>
                  <button
                    onClick={() => router.push("/wallet/add-money")}
                    className="mt-2 text-xs font-semibold text-red-700 underline"
                  >
                    Recharge Wallet
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setIsBookingOpen(false)
                  setSelectedDate("")
                  setSelectedSlot("")
                  setSessionType("chat")
                  setDuration(15)
                }}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedDate || !selectedSlot) {
                    alert("Please select a date and time slot.")
                    return
                  }

                  if (!canAfford) {
                    alert("Insufficient balance. Please recharge your wallet.")
                    return
                  }

                  setIsBooking(true)

                  try {
                    // Use 12-hour format if available, otherwise fallback to 24-hour
                    const requestBody: any = {
                      astrologer_id: astrologer.id,
                      session_date: selectedDate,
                      session_type: sessionType,
                      duration_minutes: duration,
                    }
                    
                    // Check if selectedSlot is in 12-hour format (contains AM/PM)
                    if (selectedSlot && (selectedSlot.includes('AM') || selectedSlot.includes('PM'))) {
                      requestBody.session_time_12h = selectedSlot
                    } else {
                      // Legacy 24-hour format support
                      requestBody.session_time = selectedSlot
                    }

                    const response = await fetch("/api/bookings/create", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(requestBody),
                    })

                    const result = await response.json()

                    if (response.ok && result.success) {
                      const sessionLink = result.data.session_links?.user || ''
                      const linkValidUntil = result.data.session_links?.valid_until
                        ? new Date(result.data.session_links.valid_until).toLocaleString()
                        : 'N/A'

                      alert(
                        `✅ Booking Confirmed!\n\n` +
                        `Reference: ${result.data.booking_reference}\n` +
                        `Session: ${sessionType.toUpperCase()}\n` +
                        `Date: ${selectedDate} at ${selectedSlot}\n` +
                        `Duration: ${duration} minutes\n` +
                        `Amount: ₹${result.data.amount}\n` +
                        `New Balance: ₹${result.data.new_balance}\n\n` +
                        `📧 Session link sent to your email!\n\n` +
                        `🔗 Session Link:\n${sessionLink}\n\n` +
                        `⏰ Link valid until: ${linkValidUntil}\n\n` +
                        `Tip: Save this link to join your session!`
                      )

                      // Log link for easy access
                      console.log('🎥 Your Session Link:', sessionLink)
                      console.log('⏰ Valid Until:', linkValidUntil)

                      setIsBookingOpen(false)
                      setSelectedDate("")
                      setSelectedSlot("")
                      setSessionType("chat")
                      setDuration(15)
                      // Refresh wallet balance
                      const walletResponse = await fetch("/api/wallet/balance")
                      if (walletResponse.ok) {
                        const walletData = await walletResponse.json()
                        setWalletBalance(walletData.balance || 0)
                      }
                    } else if (result.error === "INSUFFICIENT_BALANCE") {
                      alert(
                        `❌ Insufficient Balance!\n\n` +
                        `Required: ₹${result.data.required_amount}\n` +
                        `Available: ₹${result.data.current_balance}\n` +
                        `Shortfall: ₹${result.data.shortfall}\n\n` +
                        `Please recharge your wallet.`
                      )
                    } else {
                      alert(`❌ Booking Failed\n\n${result.message || result.error || "Unknown error"}`)
                    }
                  } catch (error: any) {
                    console.error("[Booking] Error:", error)
                    alert(`Booking failed: ${error.message}`)
                  } finally {
                    setIsBooking(false)
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={!selectedDate || !selectedSlot || !hasAvailability || !canAfford || isBooking}
              >
                {isBooking ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Booking...</span>
                  </>
                ) : (
                  `Confirm Booking (₹${totalAmount.toFixed(0)})`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
