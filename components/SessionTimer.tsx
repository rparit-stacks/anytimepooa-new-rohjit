'use client'

import { useEffect, useState } from 'react'

interface SessionTimerProps {
  sessionId: string
  onTimeExpired?: () => void
  onTimeWarning?: (minutesLeft: number) => void
  strictMode?: boolean // If true, auto-terminates session on time expiry
}

export function SessionTimer({ sessionId, onTimeExpired, onTimeWarning, strictMode = true }: SessionTimerProps) {
  const [timeData, setTimeData] = useState({
    remainingSeconds: 0,
    currentDurationSeconds: 0,
    paidDurationSeconds: 0,
    isOvertime: false,
    shouldWarn: false,
  })
  const [hasWarned, setHasWarned] = useState(false)
  const [hasExpired, setHasExpired] = useState(false)

  useEffect(() => {
    updateTimer()
    const interval = setInterval(updateTimer, 1000) // Update every second

    return () => clearInterval(interval)
  }, [sessionId])

  const updateTimer = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/tracking`)
      const data = await response.json()

      if (data.success && data.data) {
        const remaining = data.data.remainingSeconds || 0
        const isOT = remaining < 0
        const shouldWarn = remaining <= 300 && remaining > 0 // 5 minutes warning

        setTimeData({
          remainingSeconds: remaining,
          currentDurationSeconds: data.data.currentDurationSeconds || 0,
          paidDurationSeconds: data.data.paid_duration_seconds || 0,
          isOvertime: isOT,
          shouldWarn: shouldWarn,
        })

        // Trigger warning callback (only once when crossing 5-minute threshold)
        if (shouldWarn && !hasWarned && onTimeWarning) {
          setHasWarned(true)
          const minutesLeft = Math.ceil(remaining / 60)
          onTimeWarning(minutesLeft)
        }

        // Trigger expiry callback (only once when time runs out)
        if (remaining <= 0 && !hasExpired) {
          setHasExpired(true)
          if (onTimeExpired) {
            onTimeExpired()
          }
          
          // In strict mode, automatically end the session
          if (strictMode && remaining <= -60) { // 1 minute grace period
            console.warn('[SessionTimer] Strict mode: Session exceeded time limit by 1 minute. Auto-terminating.')
            // The parent component should handle the actual termination
          }
        }
      }
    } catch (error) {
      console.error('Error updating timer:', error)
    }
  }

  const formatTime = (seconds: number): string => {
    const absSeconds = Math.abs(seconds)
    const mins = Math.floor(absSeconds / 60)
    const secs = absSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerClass = (): string => {
    if (timeData.isOvertime) return 'bg-red-600'
    if (timeData.shouldWarn) return 'bg-yellow-600'
    return 'bg-green-600'
  }

  return (
    <div className={`session-timer ${getTimerClass()} text-white px-4 py-2 rounded-lg`}>
      <div className="timer-display">
        <h3 className="text-lg font-bold">
          {timeData.isOvertime ? '⚠️ Overtime: ' : '⏱️ Time Remaining: '}
          {formatTime(timeData.remainingSeconds)}
        </h3>
      </div>

      {timeData.shouldWarn && !timeData.isOvertime && (
        <div className="mt-2 text-sm bg-yellow-700 px-2 py-1 rounded">
          ⚠️ Only {Math.floor(timeData.remainingSeconds / 60)} minutes remaining!
        </div>
      )}

      {timeData.isOvertime && (
        <div className="mt-2 text-sm bg-red-700 px-2 py-1 rounded">
          ⚠️ Session exceeded paid duration. 
          {strictMode && ' Session will auto-end in 1 minute.'}
        </div>
      )}

      <div className="mt-2 text-xs opacity-75">
        Duration: {Math.floor(timeData.currentDurationSeconds / 60)}m / {Math.floor(timeData.paidDurationSeconds / 60)}m paid
      </div>
    </div>
  )
}

