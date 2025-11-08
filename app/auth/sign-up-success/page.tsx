"use client"

import Link from "next/link"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function SignUpSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // Auto redirect to login after 3 seconds
    const timer = setTimeout(() => {
      router.push("/auth/login")
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-2xl p-8 space-y-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="/logono.png"
              alt="Anytime Pooja"
              className="w-12 h-12 rounded-full object-cover shadow-lg"
            />
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-900">Anytime Pooja</h2>
              <p className="text-xs text-orange-600 font-semibold">Your Spiritual Journey</p>
            </div>
          </div>

          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-green-900 dark:text-green-100">Welcome Aboard!</h1>
            <p className="text-green-700 dark:text-green-300 text-lg font-semibold">Signup Success</p>
            <p className="text-gray-600 dark:text-gray-400 text-base mt-3">Please login to continue</p>
          </div>

          <Link href="/auth/login" className="w-full block">
            <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold h-14 rounded-full gap-2 shadow-lg">
              Go to Login <ArrowRight size={20} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
