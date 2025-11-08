"use client"

import { useEffect, useState } from "react"

interface DebugInfo {
  timestamp: string
  environment: {
    NODE_ENV: string
    VERCEL: string
    VERCEL_ENV: string
  }
  cookies: {
    sessionToken: string | null
    allCookies: Array<{ name: string; value: string; hasValue: boolean }>
    cookieCount: number
  }
  session: {
    exists: boolean
    userId: string | null
    expiresAt: string | null
    isExpired: boolean | null
  }
  user: {
    exists: boolean
    id: string | null
    email: string | null
  }
  request: {
    path: string
    method: string
    headers: {
      cookie: string | null
      userAgent: string | null
    }
  }
}

export function SessionDebugger() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchDebugInfo = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/debug/session", {
        credentials: "include",
        cache: "no-store",
      })
      const data = await response.json()
      setDebugInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch debug info")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebugInfo()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchDebugInfo, 2000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_DEBUG) {
    return null // Hide in production unless debug flag is set
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-xl max-w-md text-xs z-50 font-mono text-xs overflow-auto max-h-96">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm">🔍 Session Debugger</h3>
        <div className="flex gap-2">
          <button
            onClick={fetchDebugInfo}
            className="px-2 py-1 bg-blue-600 rounded text-xs"
            disabled={loading}
          >
            {loading ? "..." : "Refresh"}
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2 py-1 rounded text-xs ${
              autoRefresh ? "bg-green-600" : "bg-gray-600"
            }`}
          >
            {autoRefresh ? "⏸ Auto" : "▶ Auto"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-600 p-2 rounded mb-2">
          <strong>Error:</strong> {error}
        </div>
      )}

      {debugInfo && (
        <div className="space-y-2">
          <div>
            <strong>Time:</strong> {new Date(debugInfo.timestamp).toLocaleTimeString()}
          </div>

          <div className="border-t border-gray-700 pt-2">
            <strong>Environment:</strong>
            <div className="ml-2 text-gray-300">
              NODE_ENV: {debugInfo.environment.NODE_ENV || "undefined"}
              <br />
              VERCEL: {debugInfo.environment.VERCEL || "undefined"}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-2">
            <strong>Cookies:</strong>
            <div className="ml-2 text-gray-300">
              Session Token: {debugInfo.cookies.sessionToken || "❌ Missing"}
              <br />
              Cookie Count: {debugInfo.cookies.cookieCount}
              <br />
              All: {debugInfo.cookies.allCookies.map(c => c.name).join(", ") || "none"}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-2">
            <strong>Session (DB):</strong>
            <div className="ml-2 text-gray-300">
              Exists: {debugInfo.session.exists ? "✅ YES" : "❌ No"}
              <br />
              User ID: {debugInfo.session.userId || "N/A"}
              <br />
              Expired: {debugInfo.session.isExpired ? "⚠️ Yes" : "✅ No"}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-2">
            <strong>User:</strong>
            <div className="ml-2 text-gray-300">
              Exists: {debugInfo.user.exists ? "✅ YES" : "❌ No"}
              <br />
              Email: {debugInfo.user.email || "N/A"}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-2 text-gray-400 text-xs">
            <details>
              <summary className="cursor-pointer">Raw Data</summary>
              <pre className="mt-2 overflow-auto text-xs">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  )
}

