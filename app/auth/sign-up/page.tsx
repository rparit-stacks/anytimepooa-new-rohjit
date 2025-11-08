"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Lock, AlertCircle, Loader2, ArrowLeft, Check } from "lucide-react"

export default function SignUpPage() {
  const [step, setStep] = useState<"email" | "password" | "otp" | "kundli">("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [kundli, setKundli] = useState({
    birthDate: "",
    birthTime: "",
    birthPlace: "",
    gender: "",
    maritalStatus: "",
  })
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const otpInputRef = useRef<HTMLInputElement>(null)
  const fullNameInputRef = useRef<HTMLInputElement>(null)

  // Handle keyboard opening - scroll input into view
  useEffect(() => {
    const handleInputFocus = (input: HTMLInputElement | null) => {
      if (!input || !cardRef.current) return
      
      // Small delay to ensure keyboard is opening
      setTimeout(() => {
        // Scroll input into view with some padding
        input.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        })
        
        // Also scroll the card container if needed
        if (cardRef.current) {
          const rect = input.getBoundingClientRect()
          const viewportHeight = window.visualViewport?.height || window.innerHeight
          const keyboardHeight = window.innerHeight - viewportHeight
          
          if (keyboardHeight > 0 && rect.bottom > viewportHeight - 100) {
            const scrollAmount = rect.bottom - (viewportHeight - 100)
            window.scrollBy({
              top: scrollAmount,
              behavior: 'smooth'
            })
          }
        }
      }, 300)
    }

    // Handle visual viewport changes (keyboard open/close)
    const handleViewportChange = () => {
      const activeElement = document.activeElement as HTMLInputElement
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
        handleInputFocus(activeElement)
      }
    }

    // Listen for visual viewport changes
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange)
      window.visualViewport.addEventListener('scroll', handleViewportChange)
    }

    // Handle input focus events
    const emailInput = emailInputRef.current
    const passwordInput = passwordInputRef.current
    const otpInput = otpInputRef.current
    const fullNameInput = fullNameInputRef.current

    if (emailInput) {
      emailInput.addEventListener('focus', () => handleInputFocus(emailInput))
    }
    if (passwordInput) {
      passwordInput.addEventListener('focus', () => handleInputFocus(passwordInput))
    }
    if (otpInput) {
      otpInput.addEventListener('focus', () => handleInputFocus(otpInput))
    }
    if (fullNameInput) {
      fullNameInput.addEventListener('focus', () => handleInputFocus(fullNameInput))
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange)
        window.visualViewport.removeEventListener('scroll', handleViewportChange)
      }
      if (emailInput) {
        emailInput.removeEventListener('focus', () => handleInputFocus(emailInput))
      }
      if (passwordInput) {
        passwordInput.removeEventListener('focus', () => handleInputFocus(passwordInput))
      }
      if (otpInput) {
        otpInput.removeEventListener('focus', () => handleInputFocus(otpInput))
      }
      if (fullNameInput) {
        fullNameInput.removeEventListener('focus', () => handleInputFocus(fullNameInput))
      }
    }
  }, [step])

  // Step 1: Send OTP to email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/generate-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      
      // Check if response is JSON
      const contentType = res.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text()
        console.error("Non-JSON response:", text)
        throw new Error("Server error: Invalid response format")
      }
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send OTP")
      setStep("otp")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP")
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      })
      
      // Check if response is JSON
      const contentType = res.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text()
        console.error("Non-JSON response:", text)
        throw new Error("Server error: Invalid response format")
      }
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Invalid OTP")
      setStep("password")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP")
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Set password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    setStep("kundli")
  }

  // Step 4: Collect kundli & create account
  const handleKundliSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/signup-with-kundli", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName, kundli }),
      })
      
      // Check if response is JSON
      const contentType = res.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text()
        console.error("Non-JSON response:", text)
        throw new Error("Server error: Invalid response format")
      }
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Signup failed")
      router.push("/auth/sign-up-success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-screen min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/signup.png')" }}
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

      {/* Signup Card - Edge to Edge Bottom with Rounded Top */}
      <div ref={cardRef} className="absolute bottom-0 left-0 right-0 w-full transition-all duration-700 animate-slide-up" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
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
              <Check size={28} className="text-white" strokeWidth={2} />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">Join Anytime Pooja</CardTitle>
            <CardDescription className="text-base text-gray-600 mt-2">
              Step {step === "email" ? 1 : step === "otp" ? 2 : step === "password" ? 3 : 4} of 4
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 pb-8 px-6 max-h-[70vh] overflow-y-auto">
            {step === "email" && (
              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 font-medium">
                    <Mail size={16} className="text-primary" strokeWidth={2} />
                    Email Address
                  </Label>
                  <Input
                    ref={emailInputRef}
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
                  <p className="text-xs text-muted-foreground">We'll send an OTP to verify</p>
                </div>
                {error && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-2 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <span>{error}</span>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold h-14 rounded-full transition-all duration-300 hover:shadow-xl gap-2 text-base touch-manipulation shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : null}
                  {isLoading ? "Sending..." : "Send OTP"}
                </Button>
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
                    ref={otpInputRef}
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
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-2 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <span>{error}</span>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold h-14 rounded-full transition-all duration-300 hover:shadow-xl gap-2 text-base touch-manipulation shadow-lg"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : null}
                  Verify OTP
                </Button>
              </form>
            )}

            {step === "password" && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2 font-medium">
                    <Lock size={16} className="text-primary" strokeWidth={2} />
                    Create Password
                  </Label>
                  <Input
                    ref={passwordInputRef}
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-secondary border-input focus:border-primary focus:ring-primary text-base"
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">At least 6 characters</p>
                </div>
                {error && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-2 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <span>{error}</span>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold h-14 rounded-full transition-all duration-300 hover:shadow-xl gap-2 text-base touch-manipulation shadow-lg"
                  disabled={isLoading}
                >
                  Continue to Kundli
                </Button>
              </form>
            )}

            {step === "kundli" && (
              <form onSubmit={handleKundliSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="font-medium text-sm">
                    Full Name
                  </Label>
                  <Input
                    ref={fullNameInputRef}
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-secondary border-input focus:border-primary focus:ring-primary text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="font-medium text-sm">
                    Birth Date
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    required
                    value={kundli.birthDate}
                    onChange={(e) => setKundli({ ...kundli, birthDate: e.target.value })}
                    className="bg-secondary border-input focus:border-primary focus:ring-primary text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthTime" className="font-medium text-sm">
                    Birth Time
                  </Label>
                  <Input
                    id="birthTime"
                    type="time"
                    required
                    value={kundli.birthTime}
                    onChange={(e) => setKundli({ ...kundli, birthTime: e.target.value })}
                    className="bg-secondary border-input focus:border-primary focus:ring-primary text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthPlace" className="font-medium text-sm">
                    Birth Place
                  </Label>
                  <Input
                    id="birthPlace"
                    type="text"
                    placeholder="City, Country"
                    required
                    value={kundli.birthPlace}
                    onChange={(e) => setKundli({ ...kundli, birthPlace: e.target.value })}
                    className="bg-secondary border-input focus:border-primary focus:ring-primary text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender" className="font-medium text-sm">
                    Gender
                  </Label>
                  <select
                    id="gender"
                    required
                    value={kundli.gender}
                    onChange={(e) => setKundli({ ...kundli, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-primary text-base"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maritalStatus" className="font-medium text-sm">
                    Marital Status
                  </Label>
                  <select
                    id="maritalStatus"
                    required
                    value={kundli.maritalStatus}
                    onChange={(e) => setKundli({ ...kundli, maritalStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-primary text-base"
                  >
                    <option value="">Select Status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
                {error && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-2 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <span>{error}</span>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold h-14 rounded-full transition-all duration-300 hover:shadow-xl gap-2 text-base touch-manipulation shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : null}
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            )}

            <div className="relative py-3 mt-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Already have an account?</span>
              </div>
            </div>

            <Link href="/auth/login" className="w-full block">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full border-2 border-orange-500/30 hover:border-orange-500 hover:bg-orange-50 bg-transparent h-12 text-base touch-manipulation font-semibold text-orange-600"
              >
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
