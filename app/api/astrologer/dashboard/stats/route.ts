import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

async function getAstrologerFromSession() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("astrologer_session_token")?.value

  if (!sessionToken) {
    return null
  }

  const supabase = await createClient()

  const { data: session } = await supabase
    .from("astrologer_sessions")
    .select("astrologer_id")
    .eq("token", sessionToken)
    .gt("expires_at", new Date().toISOString())
    .single()

  return session?.astrologer_id || null
}

export async function GET(request: Request) {
  try {
    const astrologerId = await getAstrologerFromSession()

    if (!astrologerId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Get wallet balance
    const { data: wallet } = await supabase
      .from("astrologer_wallet_balance")
      .select("*")
      .eq("astrologer_id", astrologerId)
      .single()

    // Get total bookings count
    const { count: totalBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("astrologer_id", astrologerId)

    // Get pending bookings count
    const { count: pendingBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("astrologer_id", astrologerId)
      .eq("astrologer_status", "pending")

    // Get completed bookings count
    const { count: completedBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("astrologer_id", astrologerId)
      .eq("status", "completed")

    // Get today's bookings
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: todayBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("astrologer_id", astrologerId)
      .gte("created_at", today.toISOString())

    // Get pooja items count
    const { count: poojaCount } = await supabase
      .from("pooja_items")
      .select("*", { count: "exact", head: true })
      .eq("astrologer_id", astrologerId)

    // Get recent transactions
    const { data: recentTransactions } = await supabase
      .from("astrologer_wallet_transactions")
      .select("*")
      .eq("astrologer_id", astrologerId)
      .order("created_at", { ascending: false })
      .limit(5)

    // Get unread notifications count
    const { count: unreadNotifications } = await supabase
      .from("astrologer_notifications")
      .select("*", { count: "exact", head: true })
      .eq("astrologer_id", astrologerId)
      .eq("is_read", false)

    // Calculate this month's earnings
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const { data: monthTransactions } = await supabase
      .from("astrologer_wallet_transactions")
      .select("amount")
      .eq("astrologer_id", astrologerId)
      .eq("type", "credit")
      .gte("created_at", firstDayOfMonth.toISOString())

    const monthEarnings = monthTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

    return NextResponse.json({
      success: true,
      stats: {
        wallet: {
          balance: wallet?.balance || 0,
          total_earnings: wallet?.total_earnings || 0,
          pending_amount: wallet?.pending_amount || 0,
          available_balance: (wallet?.balance || 0) - (wallet?.pending_amount || 0),
        },
        bookings: {
          total: totalBookings || 0,
          pending: pendingBookings || 0,
          completed: completedBookings || 0,
          today: todayBookings || 0,
        },
        services: {
          pooja_items: poojaCount || 0,
        },
        earnings: {
          this_month: monthEarnings,
        },
        notifications: {
          unread: unreadNotifications || 0,
        },
        recent_transactions: recentTransactions || [],
      },
    })
  } catch (error: any) {
    console.error("[astrologer/dashboard/stats] Unexpected error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
