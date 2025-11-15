import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, reason = 'completed' } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Call the end_session function
    const { data, error } = await supabase
      .rpc('end_session', {
        p_session_id: sessionId,
        p_reason: reason
      });

    if (error) {
      console.error('End session error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to end session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      durationSeconds: data.duration_seconds,
      amountReleased: data.amount_released,
      message: data.message
    });

  } catch (error) {
    console.error('Session end error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

