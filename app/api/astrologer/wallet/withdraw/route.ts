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

export async function POST(request: Request) {
  try {
    const astrologerId = await getAstrologerFromSession()

    if (!astrologerId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const { amount, payment_method, bank_details } = await request.json()

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      )
    }

    if (!payment_method || !["bank_transfer", "upi"].includes(payment_method)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      )
    }

    if (payment_method === "bank_transfer") {
      if (!bank_details?.account_number || !bank_details?.ifsc_code || !bank_details?.account_holder_name || !bank_details?.bank_name) {
        return NextResponse.json(
          { error: "Bank details are required" },
          { status: 400 }
        )
      }
    }

    if (payment_method === "upi" && !bank_details?.upi_id) {
      return NextResponse.json(
        { error: "UPI ID is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Call database function to request withdrawal
    const { data, error } = await supabase.rpc("request_withdrawal", {
      p_astrologer_id: astrologerId,
      p_amount: amount,
      p_payment_method: payment_method,
      p_bank_details: bank_details,
    })

    if (error) {
      console.error("[astrologer/wallet/withdraw] Error:", error)
      return NextResponse.json(
        { error: "Failed to request withdrawal" },
        { status: 500 }
      )
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to request withdrawal" },
        { status: 400 }
      )
    }

    // Create notification
    await supabase.from("astrologer_notifications").insert({
      astrologer_id: astrologerId,
      type: "withdrawal_requested",
      title: "Withdrawal Requested",
      message: `Your withdrawal request of ₹${amount} has been submitted. It will be processed within 2-3 business days.`,
      reference_type: "withdrawal",
      reference_id: result.withdrawal_id,
      priority: "normal",
    })

    return NextResponse.json({
      success: true,
      message: "Withdrawal request submitted successfully",
      withdrawal_id: result.withdrawal_id,
    })
  } catch (error: any) {
    console.error("[astrologer/wallet/withdraw] Unexpected error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// Get withdrawal history
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

    const { data: withdrawals, error } = await supabase
      .from("astrologer_withdrawals")
      .select("*")
      .eq("astrologer_id", astrologerId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[astrologer/wallet/withdraw] GET Error:", error)
      return NextResponse.json(
        { error: "Failed to fetch withdrawals" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals || [],
    })
  } catch (error: any) {
    console.error("[astrologer/wallet/withdraw] GET Unexpected error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
