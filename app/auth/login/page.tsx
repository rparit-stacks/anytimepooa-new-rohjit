"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Lock, AlertCircle, Loader2, ArrowLeft } from "lucide-react"
import { useEffect } from "react"

export default function LoginPage() {
  const [step, setStep] = useState<"credentials" | "otp">("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Don't check session on login page - let middleware handle redirects
  // This prevents infinite redirect loops

  // Step 1: Submit credentials & send OTP
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/login-with-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, step: "verify-credentials" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStep("otp")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP")
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Verify OTP & login with password
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/login-with-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, otp, step: "verify-otp" }),
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      // Check if cookie was set in response
      const setCookieHeader = res.headers.get("set-cookie")
      console.log("[Client] Login response - Set-Cookie header:", setCookieHeader)
      
      // Verify cookie is set by checking with debug endpoint
      const verifyCookie = async () => {
        try {
          const debugRes = await fetch("/api/debug/session", {
            credentials: "include",
            cache: "no-store",
          })
          const debugData = await debugRes.json()
          console.log("[Client] Cookie verification:", debugData.cookies)
          
          if (debugData.cookies.sessionToken) {
            console.log("[Client] ✅ Cookie verified, redirecting...")
            window.location.href = "/dashboard"
          } else {
            console.log("[Client] ⚠️ Cookie not found, retrying in 500ms...")
            setTimeout(verifyCookie, 500)
          }
        } catch (err) {
          console.error("[Client] Cookie verification error:", err)
          // Redirect anyway after delay
          setTimeout(() => {
            window.location.href = "/dashboard"
          }, 1000)
        }
      }
      
      // Start verification after a short delay
      setTimeout(verifyCookie, 300)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
      setIsLoading(false)
    }
  }

  return (
    <div className="w-screen min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/login.png')" }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Back Button */}
      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 p-2 bg-white/90 backdrop-blur-sm rounded-full transition-colors touch-manipulation shadow-lg"
        aria-label="Go back"
      >
        <ArrowLeft size={24} className="text-gray-900" />
      </Link>

      {/* Login Card - Edge to Edge Bottom with Rounded Top */}
      <div className="absolute bottom-0 left-0 right-0 w-full transition-all duration-700 animate-slide-up">
        <Card className="rounded-t-3xl sm:rounded-t-[2.5rem] shadow-2xl border-0 bg-white/95 backdrop-blur-xl">
          <CardHeader className="text-center border-b border-gray-200/50 pb-6 pt-8">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <img
                src="/logono.png"
                alt="Anytime Pooja"
                className="w-12 h-12 rounded-full object-cover shadow-lg"
              />
              <div className="text-left">
                <h1 className="text-xl font-bold text-gray-900">Anytime Pooja</h1>
                <p className="text-xs text-orange-600 font-semibold">Your Spiritual Journey</p>
              </div>
            </div>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Lock size={28} className="text-white" strokeWidth={2} />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">Welcome Back</CardTitle>
            <CardDescription className="text-base text-gray-600 mt-2">Sign in to your cosmic journey</CardDescription>
          </CardHeader>

          <CardContent className="pt-6 pb-8 px-6">
            {step === "credentials" && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 font-medium">
                    <Mail size={16} className="text-primary" strokeWidth={2} />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="bg-secondary border-input focus:border-primary focus:ring-primary text-base"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2 font-medium">
                    <Lock size={16} className="text-primary" strokeWidth={2} />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-secondary border-input focus:border-primary focus:ring-primary text-base"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-2 text-sm text-red-700 dark:text-red-400 animate-fade-in">
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold h-14 rounded-full transition-all duration-300 hover:shadow-xl gap-2 text-base touch-manipulation shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 size={20} className="animate-spin" strokeWidth={2} />}
                  {isLoading ? "Sending OTP..." : "Send OTP"}
                </Button>

                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-600">New to Anytime Pooja?</span>
                  </div>
                </div>

                <Link href="/auth/sign-up" className="w-full block">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-full border-2 border-orange-500/30 hover:border-orange-500 hover:bg-orange-50 bg-transparent h-12 text-base touch-manipulation font-semibold text-orange-600"
                  >
                    Create Account
                  </Button>
                </Link>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="flex items-center gap-2 font-medium">
                    <Mail size={16} className="text-primary" strokeWidth={2} />
                    Enter OTP
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={isLoading}
                    className="bg-secondary border-input focus:border-primary focus:ring-primary text-base text-center text-2xl tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground">Check your email for the 6-digit code</p>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-2 text-sm text-red-700 dark:text-red-400 animate-fade-in">
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold h-14 rounded-full transition-all duration-300 hover:shadow-xl gap-2 text-base touch-manipulation shadow-lg"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading && <Loader2 size={20} className="animate-spin" strokeWidth={2} />}
                  {isLoading ? "Verifying..." : "Verify & Sign In"}
                </Button>

                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-gray-600 hover:text-orange-600 hover:bg-orange-50 h-12 rounded-full font-semibold" 
                  onClick={() => setStep("credentials")}
                >
                  Back to credentials
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
