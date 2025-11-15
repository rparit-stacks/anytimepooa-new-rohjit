import { createClient } from "@/lib/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('session_messages')
      .select(`
        id,
        sender_type,
        sender_id,
        message,
        created_at,
        user:users!session_messages_sender_id_fkey(full_name),
        astrologer:astrologers!session_messages_sender_id_fkey(name)
      `)
      .eq('booking_id', id)
      .order('created_at', { ascending: true })

    if (error) throw error

    const messages = (data || []).map((msg: any) => ({
      id: msg.id,
      sender_type: msg.sender_type,
      sender_id: msg.sender_id,
      sender_name: msg.sender_type === 'user' ? msg.user?.full_name : msg.astrologer?.name,
      message: msg.message,
      created_at: msg.created_at
    }))

    return Response.json({
      success: true,
      data: messages
    })
  } catch (err: any) {
    console.error("[chat-history] Error:", err)
    return Response.json(
      { error: err.message || "Failed to fetch chat history" },
      { status: 500 }
    )
  }
}

