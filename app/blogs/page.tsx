"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { vibrate } from "@/lib/vibration"
import Link from "next/link"
import { Card } from "@/components/ui/card"

const PLACEHOLDER_IMAGE = "/istockphoto-1427121205-612x612.jpg"

const blogPosts = [
  {
    id: "1",
    title: "Understanding Your Birth Chart",
    excerpt: "Learn how to read and interpret your natal chart to understand your personality and life path.",
    image: PLACEHOLDER_IMAGE,
    date: "2 days ago",
    author: "AstroTalk Team",
  },
  {
    id: "2",
    title: "The Power of Planetary Transits",
    excerpt: "Discover how planetary movements affect your daily life and what you can do to harness their energy.",
    image: PLACEHOLDER_IMAGE,
    date: "5 days ago",
    author: "AstroTalk Team",
  },
  {
    id: "3",
    title: "Vedic vs Western Astrology",
    excerpt: "A comprehensive guide to understanding the differences between Vedic and Western astrology systems.",
    image: PLACEHOLDER_IMAGE,
    date: "1 week ago",
    author: "AstroTalk Team",
  },
  {
    id: "4",
    title: "Remedies for Malefic Planets",
    excerpt: "Learn about effective remedies and rituals to mitigate the negative effects of malefic planets in your chart.",
    image: PLACEHOLDER_IMAGE,
    date: "2 weeks ago",
    author: "AstroTalk Team",
  },
  {
    id: "5",
    title: "Muhurat: Choosing Auspicious Times",
    excerpt: "Understand the importance of muhurat and how to choose the best time for important events in your life.",
    image: PLACEHOLDER_IMAGE,
    date: "3 weeks ago",
    author: "AstroTalk Team",
  },
  {
    id: "6",
    title: "Gemstones and Their Astrological Benefits",
    excerpt: "Explore how wearing the right gemstones can enhance positive planetary influences in your life.",
    image: PLACEHOLDER_IMAGE,
    date: "1 month ago",
    author: "AstroTalk Team",
  },
]

export default function BlogsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 pb-24 relative overflow-x-hidden" style={{ paddingBottom: "6rem" }}>
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>

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
        <h1 className="text-2xl font-bold text-gray-900">Astrology Insights & Tips</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <Card
              key={post.id}
              className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group active:scale-95 border border-gray-100"
              onClick={() => {
                vibrate()
                router.push(`/blogs/${post.id}`)
              }}
            >
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-orange-50 to-yellow-50">
                <img
                  src={post.image || PLACEHOLDER_IMAGE}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = PLACEHOLDER_IMAGE
                  }}
                />
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <i className="fas fa-clock text-xs"></i>
                  {post.date}
                </p>
                <h4 className="font-bold text-lg mb-2 line-clamp-2">{post.title}</h4>
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    <i className="fas fa-user mr-1"></i>
                    {post.author}
                  </p>
                  <button className="text-orange-600 hover:text-orange-700 font-semibold text-sm flex items-center gap-1.5">
                    Read More <i className="fas fa-arrow-right text-xs"></i>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}


