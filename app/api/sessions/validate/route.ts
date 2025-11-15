import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { valid: false, message: 'Token is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Validate session using the database function
    const { data: validationData, error: validationError } = await supabase
      .rpc('is_session_link_valid', { p_token: token });

    if (validationError) {
      console.error('Validation error:', validationError);
      return NextResponse.json(
        { valid: false, message: 'Failed to validate session' },
        { status: 500 }
      );
    }

    if (!validationData.valid) {
      return NextResponse.json({
        valid: false,
        message: validationData.message || 'Invalid session',
        error: validationData.error
      });
    }

    // Get additional session details
    const { data: sessionDetails, error: sessionError } = await supabase
      .from('webrtc_sessions')
      .select(`
        id,
        room_id,
        session_type,
        paid_duration_minutes,
        status,
        scheduled_start_time,
        user_id,
        astrologer_id,
        booking_id
      `)
      .eq('id', validationData.session_id)
      .single();

    if (sessionError || !sessionDetails) {
      return NextResponse.json(
        { valid: false, message: 'Session not found' },
        { status: 404 }
      );
    }

    // Determine participant type and get other participant name
    const isUser = validationData.participant_type === 'user';
    const otherParticipantId = isUser ? sessionDetails.astrologer_id : sessionDetails.user_id;
    
    // Get other participant name
    const { data: otherParticipant } = await supabase
      .from(isUser ? 'astrologers' : 'users')
      .select(isUser ? 'name' : 'full_name')
      .eq('id', otherParticipantId)
      .single();

    const otherParticipantName = isUser 
      ? (otherParticipant as any)?.name 
      : (otherParticipant as any)?.full_name;

    return NextResponse.json({
      valid: true,
      sessionId: sessionDetails.id,
      roomId: sessionDetails.room_id,
      sessionType: sessionDetails.session_type,
      participantType: validationData.participant_type,
      participantId: validationData.participant_id,
      otherParticipantName: otherParticipantName || 'Unknown',
      paidDurationMinutes: sessionDetails.paid_duration_minutes,
      status: sessionDetails.status,
      scheduledStartTime: sessionDetails.scheduled_start_time,
      bookingId: sessionDetails.booking_id
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { valid: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
