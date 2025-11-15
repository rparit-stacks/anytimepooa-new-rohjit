import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("astrologer_session_token")?.value

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: session } = await supabase
      .from("astrologer_sessions")
      .select("astrologer_id")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Fetch reviews from testimonials table
    const { data: reviews, error } = await supabase
      .from("testimonials")
      .select(`
        id,
        user_id,
        rating,
        review_text,
        created_at,
        user_avatar_url,
        users(name)
      `)
      .eq("astrologer_id", session.astrologer_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[astrologer/profile/reviews] Error:", error)
      return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
    }

    // Process reviews to add user name
    const processedReviews = (reviews || []).map((review: any) => ({
      ...review,
      user_name: review.users?.name || "Anonymous User",
    }))

    // Calculate stats
    const total_reviews = processedReviews.length
    const average_rating = total_reviews > 0
      ? processedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / total_reviews
      : 0

    const rating_breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    processedReviews.forEach((review: any) => {
      rating_breakdown[review.rating as keyof typeof rating_breakdown]++
    })

    return NextResponse.json({
      success: true,
      reviews: processedReviews,
      stats: {
        average_rating,
        total_reviews,
        rating_breakdown,
      },
    })
  } catch (error: any) {
    console.error("[astrologer/profile/reviews] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
