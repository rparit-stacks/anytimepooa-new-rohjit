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

    // Get astrologer from session
    const { data: session } = await supabase
      .from("astrologer_sessions")
      .select("astrologer_id")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Get wallet from astrologer_wallet_balance table
    const { data: wallet, error } = await supabase
      .from("astrologer_wallet_balance")
      .select("*")
      .eq("astrologer_id", session.astrologer_id)
      .single()

    if (error) {
      console.error("[astrologer/wallet] Error:", error)
      
      // If wallet doesn't exist, create one
      if (error.code === 'PGRST116') {
        const { data: newWallet } = await supabase
          .from("astrologer_wallet_balance")
          .insert({
            astrologer_id: session.astrologer_id,
            balance: 0,
            total_earnings: 0,
            frozen_amount: 0,
            pending_amount: 0,
          })
          .select()
          .single()
        
        return NextResponse.json({
          success: true,
          wallet: {
            balance: 0,
            total_earnings: 0,
            pending_amount: 0,
            frozen_amount: 0,
            available_balance: 0,
            total_withdrawn: 0,
          },
        })
      }
      
      return NextResponse.json({ error: "Failed to fetch wallet" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      wallet: {
        balance: wallet.balance || 0,
        total_earnings: wallet.total_earnings || 0,
        pending_amount: wallet.pending_amount || 0,
        frozen_amount: wallet.frozen_amount || 0,
        available_balance: wallet.balance || 0, // Available = balance (not frozen/pending)
        total_withdrawn: wallet.total_withdrawn || 0,
      },
    })
  } catch (error: any) {
    console.error("[astrologer/wallet] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
