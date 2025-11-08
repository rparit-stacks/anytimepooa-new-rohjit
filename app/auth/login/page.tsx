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

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("[CLIENT FLOW] 🚀 STEP 1: OTP SUBMIT - SENDING REQUEST")
    console.log("[CLIENT FLOW] Email:", email)
    console.log("[CLIENT FLOW] OTP:", otp)

    try {
      const res = await fetch("/api/auth/login-with-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, otp, step: "verify-otp" }),
        credentials: "include",
      })
      
      console.log("[CLIENT FLOW] ✅ STEP 2: RESPONSE RECEIVED")
      console.log("[CLIENT FLOW] Response Status:", res.status)
      console.log("[CLIENT FLOW] Response OK:", res.ok)
      
      const data = await res.json()
      console.log("[CLIENT FLOW] Response Data:", data)
      
      if (!res.ok) {
        console.log("[CLIENT FLOW] ❌ ERROR: Response not OK")
        console.log("[CLIENT FLOW] Error:", data.error)
        throw new Error(data.error)
      }
      
      console.log("[CLIENT FLOW] ✅ STEP 3: LOGIN API SUCCESS")
      
      // Check if cookie was set in response
      const setCookieHeader = res.headers.get("set-cookie")
      console.log("[CLIENT FLOW] Set-Cookie Header from Response:", setCookieHeader)
      console.log("[CLIENT FLOW] All Response Headers:", Array.from(res.headers.entries()))
      
      if (!setCookieHeader) {
        console.log("[CLIENT FLOW] ⚠️  WARNING: Set-Cookie header not found in response!")
        console.log("[CLIENT FLOW] This might be because browser doesn't expose Set-Cookie header to JavaScript")
      }
      
      // Verify cookie is set by checking with debug endpoint
      console.log("[CLIENT FLOW] 🚀 STEP 4: VERIFYING COOKIE WITH DEBUG ENDPOINT...")
      const verifyCookie = async (attempt = 1) => {
        try {
          console.log(`[CLIENT FLOW] Cookie verification attempt ${attempt}...`)
          const debugRes = await fetch("/api/debug/session", {
            credentials: "include",
            cache: "no-store",
          })
          const debugData = await debugRes.json()
          console.log("[CLIENT FLOW] Debug Endpoint Response:", debugData)
          console.log("[CLIENT FLOW] Cookie Status:", debugData.cookies)
          console.log("[CLIENT FLOW] Session Status:", debugData.session)
          console.log("[CLIENT FLOW] User Status:", debugData.user)
          
          if (debugData.cookies.sessionToken) {
            console.log("[CLIENT FLOW] ✅ STEP 5: COOKIE VERIFIED!")
            console.log("[CLIENT FLOW] Session Token:", debugData.cookies.sessionToken)
            console.log("[CLIENT FLOW] 🚀 STEP 6: REDIRECTING TO DASHBOARD...")
            window.location.href = "/dashboard"
          } else {
            console.log(`[CLIENT FLOW] ⚠️  Cookie not found (attempt ${attempt})`)
            if (attempt < 5) {
              console.log(`[CLIENT FLOW] Retrying in 500ms... (attempt ${attempt + 1}/5)`)
              setTimeout(() => verifyCookie(attempt + 1), 500)
            } else {
              console.log("[CLIENT FLOW] ❌ ERROR: Cookie verification failed after 5 attempts")
              console.log("[CLIENT FLOW] Redirecting anyway...")
              window.location.href = "/dashboard"
            }
          }
        } catch (err) {
          console.error("[CLIENT FLOW] ❌ ERROR: Cookie verification failed:", err)
          console.log("[CLIENT FLOW] Redirecting anyway after 1 second...")
          setTimeout(() => {
            window.location.href = "/dashboard"
          }, 1000)
        }
      }
      
      // Start verification after a short delay
      console.log("[CLIENT FLOW] Waiting 300ms before cookie verification...")
      setTimeout(verifyCookie, 300)
    } catch (err) {
      console.log("[CLIENT FLOW] ❌ ERROR: Login failed")
      console.log("[CLIENT FLOW] Error:", err)
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
