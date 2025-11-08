"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { vibrate } from "@/lib/vibration"

interface SidebarMenuProps {
  isOpen: boolean
  onClose: () => void
  userName?: string
}

export function SidebarMenu({ isOpen, onClose, userName }: SidebarMenuProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    vibrate()
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
      router.push("/auth/login")
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 sm:hidden"
        onClick={() => {
          vibrate()
          onClose()
        }}
      />
      
      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 overflow-y-auto pb-24">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img
                src="/logono.png"
                alt="AstroTalk"
                className="w-10 h-10 rounded-full object-cover shadow-lg"
              />
              <div>
                <h2 className="font-bold text-lg">AstroTalk</h2>
                <p className="text-base font-bold text-orange-600">Anytime Pooja</p>
              </div>
            </div>
            <button
              onClick={() => {
                vibrate()
                onClose()
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {userName && (
            <div className="mb-6 p-3 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600">Welcome back,</p>
              <p className="font-semibold text-gray-900">{userName}</p>
            </div>
          )}

          {/* Main Menu Items */}
          <div className="space-y-1 mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-3">Main Menu</h3>
            
            <Link
              href="/dashboard"
              onClick={() => {
                vibrate()
                onClose()
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === "/dashboard" ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <i className="fas fa-home text-xl w-6"></i>
              <span className="font-semibold">Home</span>
            </Link>

            <Link
              href="/wallet"
              onClick={() => {
                vibrate()
                onClose()
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === "/wallet" ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <i className="fas fa-wallet text-xl w-6"></i>
              <span className="font-semibold">Wallet</span>
            </Link>

            <Link
              href="/astrologers"
              onClick={() => {
                vibrate()
                onClose()
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === "/astrologers" ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <i className="fas fa-star text-xl w-6"></i>
              <span className="font-semibold">Astrologer</span>
            </Link>

            <Link
              href="/ecommerce"
              onClick={() => {
                vibrate()
                onClose()
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === "/ecommerce" ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <i className="fas fa-shopping-bag text-xl w-6"></i>
              <span className="font-semibold">E-commerce</span>
            </Link>

            <Link
              href="/profile"
              onClick={() => {
                vibrate()
                onClose()
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === "/profile" ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <i className="fas fa-user text-xl w-6"></i>
              <span className="font-semibold">Profile</span>
            </Link>

            <Link
              href="/notifications"
              onClick={() => {
                vibrate()
                onClose()
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <i className="fas fa-bell text-xl w-6"></i>
              <span className="font-semibold">Notifications</span>
            </Link>

            <Link
              href="/bookings"
              onClick={() => {
                vibrate()
                onClose()
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <i className="fas fa-calendar-check text-xl w-6"></i>
              <span className="font-semibold">My Bookings</span>
            </Link>

            <Link
              href="/section-chooser"
              onClick={() => {
                vibrate()
                onClose()
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <i className="fas fa-exchange-alt text-xl w-6"></i>
              <span className="font-semibold">Switch to Offline Mode</span>
            </Link>

            <button
              onClick={() => {
                vibrate()
                alert("AI Agent mode coming soon!")
                onClose()
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors"
            >
              <i className="fas fa-robot text-xl w-6"></i>
              <span className="font-semibold">Switch to AI Agent</span>
              <span className="ml-auto text-xs bg-orange-600 text-white px-2 py-1 rounded-full">Soon</span>
            </button>

            <Link
              href="/support"
              onClick={() => {
                vibrate()
                onClose()
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <i className="fas fa-question-circle text-xl w-6"></i>
              <span className="font-semibold">Support/Help</span>
            </Link>
          </div>

          {/* Legal & Info Section */}
          <div className="space-y-1 mb-6 pt-6 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-3">Legal & Info</h3>
            
            <Link
              href="/terms-conditions"
              onClick={() => {
                vibrate()
                onClose()
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
            >
              <i className="fas fa-file-contract text-lg w-6"></i>
              <span>Terms & Conditions</span>
            </Link>

            <Link
              href="/privacy-policy"
              onClick={() => {
                vibrate()
                onClose()
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
            >
              <i className="fas fa-shield-alt text-lg w-6"></i>
              <span>Privacy Policy</span>
            </Link>

            <Link
              href="/about"
              onClick={() => {
                vibrate()
                onClose()
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
            >
              <i className="fas fa-info-circle text-lg w-6"></i>
              <span>About Us</span>
            </Link>

            <Link
              href="/contact"
              onClick={() => {
                vibrate()
                onClose()
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
            >
              <i className="fas fa-envelope text-lg w-6"></i>
              <span>Contact/Feedback</span>
            </Link>
          </div>

          {/* Account Actions */}
          <div className="pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                vibrate()
                handleLogout()
                onClose()
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors font-semibold"
            >
              <i className="fas fa-sign-out-alt text-xl w-6"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}


