"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { vibrate } from "@/lib/vibration"
import Link from "next/link"

export default function SupportPage() {
  const router = useRouter()

  const faqs = [
    {
      question: "How do I book an astrologer?",
      answer: "Browse our astrologers, select one, and click 'Book' to schedule a consultation. Payment will be processed through Razorpay.",
    },
    {
      question: "How do I add money to my wallet?",
      answer: "Go to Wallet section, click 'Add Money', select an amount, choose payment gateway, and complete the payment.",
    },
    {
      question: "Can I cancel a booking?",
      answer: "Yes, you can cancel bookings from the 'My Bookings' section. Refund policy applies based on cancellation time.",
    },
    {
      question: "How do I switch between Offline and AI Agent mode?",
      answer: "Go to Profile > Switch Section to choose between Offline App and AI Agent mode (coming soon).",
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we use industry-standard encryption and security measures to protect your personal information.",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 pb-24" style={{ paddingBottom: "6rem" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 p-4 bg-white border-b border-gray-200 safe-area-top relative">
        <button
          onClick={() => {
            vibrate()
            router.back()
          }}
          className="text-gray-600 active:scale-95 transition-transform"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Support & Help</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Quick Help */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Quick Help</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/contact"
              onClick={() => vibrate()}
              className="p-4 bg-orange-50 rounded-xl text-center hover:bg-orange-100 transition-colors active:scale-95"
            >
              <i className="fas fa-envelope text-orange-600 text-2xl mb-2 block"></i>
              <p className="font-semibold text-gray-900 text-sm">Contact Us</p>
            </Link>
            <Link
              href="/faq"
              onClick={() => vibrate()}
              className="p-4 bg-orange-50 rounded-xl text-center hover:bg-orange-100 transition-colors active:scale-95"
            >
              <i className="fas fa-question-circle text-orange-600 text-2xl mb-2 block"></i>
              <p className="font-semibold text-gray-900 text-sm">FAQ</p>
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                <h4 className="font-semibold text-gray-900 mb-2">{faq.question}</h4>
                <p className="text-sm text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Support Options */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Other Support Options</h3>
          <div className="space-y-3">
            <Link
              href="mailto:support@astrotalk.com"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors"
            >
              <i className="fas fa-envelope text-orange-600 text-xl"></i>
              <span className="font-semibold text-gray-900">Email Support</span>
            </Link>
            <Link
              href="tel:+91XXXXXXXXXX"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors"
            >
              <i className="fas fa-phone text-orange-600 text-xl"></i>
              <span className="font-semibold text-gray-900">Call Support</span>
            </Link>
            <Link
              href="/contact"
              onClick={() => vibrate()}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors"
            >
              <i className="fas fa-comments text-orange-600 text-xl"></i>
              <span className="font-semibold text-gray-900">Live Chat</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


