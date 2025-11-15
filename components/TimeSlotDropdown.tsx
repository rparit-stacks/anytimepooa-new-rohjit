'use client'

import { useEffect, useState } from 'react'

interface TimeSlot {
  time_12h: string
  time_24h: string
  period: 'AM' | 'PM'
  display_label: string
}

interface TimeSlotDropdownProps {
  selectedTime: string
  onChange: (time: string) => void
  astrologerId?: string
  selectedDate?: string
}

export function TimeSlotDropdown({
  selectedTime,
  onChange,
  astrologerId,
  selectedDate,
}: TimeSlotDropdownProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTimeSlots()
  }, [astrologerId, selectedDate])

  const fetchTimeSlots = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (astrologerId) params.append('astrologerId', astrologerId)
      if (selectedDate) params.append('date', selectedDate)

      const response = await fetch(`/api/time-slots?${params}`)
      const data = await response.json()

      if (data.success) {
        setTimeSlots(data.data)
      }
    } catch (error) {
      console.error('Error fetching time slots:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor="time-select" className="block text-sm font-medium text-gray-700">
        Select Time (12-hour format)
      </label>
      <select
        id="time-select"
        value={selectedTime}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        disabled={loading}
        required
      >
        {loading ? (
          <option>Loading time slots...</option>
        ) : (
          <>
            <option value="">-- Select a time --</option>
            {timeSlots.map((slot) => (
              <option key={slot.time_12h} value={slot.display_label}>
                {slot.display_label}
              </option>
            ))}
          </>
        )}
      </select>
      {astrologerId && selectedDate && (
        <p className="text-xs text-gray-500">
          Showing only available time slots for this astrologer
        </p>
      )}
    </div>
  )
}

