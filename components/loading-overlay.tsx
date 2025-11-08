"use client"

import { Loader2 } from "lucide-react"

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin text-orange-600 mx-auto mb-4" size={48} />
        <p className="text-gray-600 font-semibold">Loading...</p>
      </div>
    </div>
  )
}


