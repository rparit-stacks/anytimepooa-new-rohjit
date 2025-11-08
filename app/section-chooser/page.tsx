"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Smartphone, Brain, ArrowRight } from "lucide-react"

export default function SectionChooserPage() {
  const router = useRouter()
  const [selected, setSelected] = useState("offline_app")
  const [loading, setLoading] = useState(false)

  const handleProceed = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/user/update-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: selected }),
      })

      if (response.status === 401) {
        router.push("/auth/login")
        return
      }

      if (response.ok) {
        router.push("/dashboard")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-orange-50 safe-area animate-fade-in">
      {/* Header */}
      <div className="p-6 text-center border-b border-gray-200 animate-slide-down">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Path</h1>
        <p className="text-gray-600">Which section would you like to explore?</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 animate-scale-in">
          {/* Offline App Option */}
          <button
            onClick={() => setSelected("offline_app")}
            className={`w-full p-6 rounded-2xl border-2 transition-all ${
              selected === "offline_app"
                ? "border-orange-600 bg-orange-50"
                : "border-gray-300 bg-white hover:border-orange-300"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${selected === "offline_app" ? "bg-orange-600" : "bg-gray-200"}`}>
                <Smartphone className={selected === "offline_app" ? "text-white" : "text-gray-600"} size={28} />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-xl font-bold text-gray-900">Offline App</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Book consultations, explore astrologers, manage your wallet
                </p>
              </div>
              {selected === "offline_app" && <div className="w-5 h-5 rounded-full bg-orange-600"></div>}
            </div>
          </button>

          {/* AI Agent Option */}
          <button
            onClick={() => {
              alert("Coming Soon! AI Agent mode will be available soon.")
            }}
            className="w-full p-6 rounded-2xl border-2 border-gray-300 bg-gray-50 opacity-75 cursor-not-allowed relative"
          >
            <div className="absolute top-2 right-2 bg-orange-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
              Coming Soon
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-gray-200">
                <Brain className="text-gray-400" size={28} />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-xl font-bold text-gray-400">AI Agent</h3>
                <p className="text-sm text-gray-500 mt-1">AI-powered insights and consultations</p>
              </div>
            </div>
          </button>

          {/* Proceed Button */}
          <button
            onClick={handleProceed}
            disabled={loading}
            className="w-full mt-8 py-4 px-6 bg-orange-600 text-white font-semibold rounded-full hover:bg-orange-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            Proceed <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
