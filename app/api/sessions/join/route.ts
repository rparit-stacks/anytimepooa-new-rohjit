import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, participantType } = await request.json();

    if (!sessionId || !participantType) {
      return NextResponse.json(
        { success: false, message: 'Session ID and participant type are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Call the start_session function
    const { data, error } = await supabase
      .rpc('start_session', {
        p_session_id: sessionId,
        p_participant_type: participantType
      });

    if (error) {
      console.error('Join session error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to join session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionActive: data.session_active,
      bothJoined: data.both_joined,
      message: data.message
    });

  } catch (error) {
    console.error('Session join error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

