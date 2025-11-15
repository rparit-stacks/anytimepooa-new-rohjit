"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface TimeSlot {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

export default function SchedulePage() {
  const router = useRouter()
  const [schedule, setSchedule] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [newSlot, setNewSlot] = useState({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "18:00",
    is_available: true,
  })

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    try {
      const response = await fetch("/api/astrologer/profile/schedule")
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/astrologer-portal/login")
          return
        }
        throw new Error("Failed to fetch schedule")
      }

      const data = await response.json()
      setSchedule(data.schedule || [])
    } catch (error) {
      console.error("Failed to fetch schedule:", error)
      setError("Failed to load schedule")
    } finally {
      setLoading(false)
    }
  }

  const addTimeSlot = async () => {
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const response = await fetch("/api/astrologer/profile/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSlot),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to add time slot")
        setSaving(false)
        return
      }

      setSuccess("Time slot added successfully!")
      await fetchSchedule()
      setNewSlot({
        day_of_week: 1,
        start_time: "09:00",
        end_time: "18:00",
        is_available: true,
      })
    } catch (err) {
      setError("Failed to add time slot")
    } finally {
      setSaving(false)
    }
  }

  const deleteTimeSlot = async (id: string) => {
    if (!confirm("Are you sure you want to delete this time slot?")) return

    try {
      const response = await fetch(`/api/astrologer/profile/schedule/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setSuccess("Time slot deleted successfully!")
        await fetchSchedule()
      } else {
        setError("Failed to delete time slot")
      }
    } catch (err) {
      setError("Failed to delete time slot")
    }
  }

  const setQuickSchedule = (type: "weekdays" | "weekend" | "all") => {
    const slots: TimeSlot[] = []

    if (type === "weekdays" || type === "all") {
      for (let day = 1; day <= 5; day++) {
        slots.push({
          day_of_week: day,
          start_time: "09:00",
          end_time: "18:00",
          is_available: true,
        })
      }
    }

    if (type === "weekend" || type === "all") {
      slots.push({
        day_of_week: 0,
        start_time: "10:00",
        end_time: "16:00",
        is_available: true,
      })
      slots.push({
        day_of_week: 6,
        start_time: "10:00",
        end_time: "16:00",
        is_available: true,
      })
    }

    return slots
  }

  const applyQuickSchedule = async (type: "weekdays" | "weekend" | "all") => {
    if (!confirm("This will replace your current schedule. Continue?")) return

    setSaving(true)
    const slots = setQuickSchedule(type)

    try {
      const response = await fetch("/api/astrologer/profile/schedule/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      })

      if (response.ok) {
        setSuccess("Quick schedule applied successfully!")
        await fetchSchedule()
      } else {
        setError("Failed to apply quick schedule")
      }
    } catch (err) {
      setError("Failed to apply quick schedule")
    } finally {
      setSaving(false)
    }
  }

  const groupedSchedule = DAYS.map((day) => ({
    ...day,
    slots: schedule.filter((slot) => slot.day_of_week === day.value),
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-[#ff6f1e] text-5xl mb-4"></i>
          <p className="text-gray-600">Loading schedule...</p>
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
          <h1 className="text-xl font-bold">Working Hours</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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

        {/* Quick Schedule Templates */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fas fa-bolt text-[#ff6f1e] mr-2"></i>
            Quick Schedule Templates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => applyQuickSchedule("weekdays")}
              disabled={saving}
              className="p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-xl transition-colors"
            >
              <i className="fas fa-briefcase text-blue-600 text-2xl mb-2"></i>
              <p className="font-semibold text-blue-900">Weekdays</p>
              <p className="text-xs text-blue-600">Mon-Fri, 9 AM - 6 PM</p>
            </button>

            <button
              onClick={() => applyQuickSchedule("weekend")}
              disabled={saving}
              className="p-4 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-xl transition-colors"
            >
              <i className="fas fa-calendar-week text-green-600 text-2xl mb-2"></i>
              <p className="font-semibold text-green-900">Weekends</p>
              <p className="text-xs text-green-600">Sat-Sun, 10 AM - 4 PM</p>
            </button>

            <button
              onClick={() => applyQuickSchedule("all")}
              disabled={saving}
              className="p-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-xl transition-colors"
            >
              <i className="fas fa-calendar-alt text-purple-600 text-2xl mb-2"></i>
              <p className="font-semibold text-purple-900">All Week</p>
              <p className="text-xs text-purple-600">Mon-Sun availability</p>
            </button>
          </div>
        </div>

        {/* Add New Time Slot */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fas fa-plus-circle text-[#ff6f1e] mr-2"></i>
            Add Time Slot
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
              <select
                value={newSlot.day_of_week}
                onChange={(e) => setNewSlot({ ...newSlot, day_of_week: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
              >
                {DAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
              <input
                type="time"
                value={newSlot.start_time}
                onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
              <input
                type="time"
                value={newSlot.end_time}
                onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={addTimeSlot}
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus mr-2"></i>}
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Current Schedule */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fas fa-calendar text-[#ff6f1e] mr-2"></i>
            Your Schedule
          </h3>

          {schedule.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-calendar-times text-gray-300 text-6xl mb-4"></i>
              <p className="text-gray-600">No schedule set yet</p>
              <p className="text-sm text-gray-500">Add time slots above or use quick templates</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedSchedule.map((day) => (
                <div key={day.value} className="border-b border-gray-100 pb-4 last:border-0">
                  <h4 className="font-semibold text-gray-900 mb-2">{day.label}</h4>
                  {day.slots.length === 0 ? (
                    <p className="text-sm text-gray-500 pl-4">Not available</p>
                  ) : (
                    <div className="space-y-2">
                      {day.slots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-3 pl-4"
                        >
                          <div className="flex items-center gap-3">
                            <i className="fas fa-clock text-[#ff6f1e]"></i>
                            <span className="font-medium text-gray-900">
                              {slot.start_time} - {slot.end_time}
                            </span>
                          </div>
                          <button
                            onClick={() => slot.id && deleteTimeSlot(slot.id)}
                            className="text-red-600 hover:text-red-700 p-2"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
