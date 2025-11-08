// Vibration utility for mobile devices
export function vibrate(duration: number = 50) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(duration)
  }
}

export function vibratePattern(pattern: number[]) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern)
  }
}


