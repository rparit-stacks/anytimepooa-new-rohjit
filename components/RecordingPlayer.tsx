'use client'

import { useEffect, useState } from 'react'

interface Recording {
  id: string
  recording_url: string
  recording_duration_seconds: number
  session_type: 'voice' | 'video'
  is_currently_available: boolean
}

interface RecordingPlayerProps {
  bookingId: string
}

export function RecordingPlayer({ bookingId }: RecordingPlayerProps) {
  const [recording, setRecording] = useState<Recording | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecording()
  }, [bookingId])

  const fetchRecording = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/recording`)
      const data = await response.json()

      if (data.success && data.data) {
        setRecording(data.data)
      }
    } catch (error) {
      console.error('Error fetching recording:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="recording-player loading p-4 text-center text-gray-500">
        Loading recording...
      </div>
    )
  }

  if (!recording || !recording.is_currently_available) {
    return (
      <div className="recording-player unavailable p-4 text-center text-gray-500 bg-gray-100 rounded-lg">
        Recording not available or has expired
      </div>
    )
  }

  return (
    <div className="recording-player space-y-4">
      <h3 className="text-lg font-bold text-gray-900">Session Recording</h3>
      <div className="recording-info flex gap-4 text-sm text-gray-600">
        <span>Type: {recording.session_type.toUpperCase()}</span>
        <span>Duration: {formatDuration(recording.recording_duration_seconds)}</span>
      </div>
      {recording.session_type === 'video' ? (
        <video
          controls
          className="recording-video w-full rounded-lg"
          src={recording.recording_url}
        >
          Your browser does not support video playback.
        </video>
      ) : (
        <audio
          controls
          className="recording-audio w-full"
          src={recording.recording_url}
        >
          Your browser does not support audio playback.
        </audio>
      )}
      <p className="text-xs text-gray-500">
        ⚠️ Recordings are automatically deleted after 30 days for privacy.
      </p>
    </div>
  )
}

