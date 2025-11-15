import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, reason = 'completed', actualDurationMinutes, elapsedSeconds } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get session details for payment calculation
    const { data: sessionData, error: sessionError } = await supabase
      .from('bookings')
      .select('astrologer_id, session_type, rate_per_minute, total_amount, user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      console.error('Failed to get session data:', sessionError);
      return NextResponse.json(
        { success: false, message: 'Session not found' },
        { status: 404 }
      );
    }

    // Calculate payment (97% to astrologer, 3% platform fee)
    let paymentAmount = 0;
    if (actualDurationMinutes && actualDurationMinutes > 0) {
      const totalEarned = actualDurationMinutes * sessionData.rate_per_minute;
      paymentAmount = Math.floor(totalEarned * 0.97); // 97% to astrologer
      
      console.log('💰 Payment calculation:', {
        actualDurationMinutes,
        ratePerMinute: sessionData.rate_per_minute,
        totalEarned,
        paymentAmount,
        platformFee: totalEarned - paymentAmount
      });
    }

    // Transfer payment to astrologer wallet
    if (paymentAmount > 0) {
      const { error: paymentError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: sessionData.astrologer_id,
          amount: paymentAmount,
          transaction_type: 'credit',
          description: `Session payment (${actualDurationMinutes} min @ ₹${sessionData.rate_per_minute}/min)`,
          status: 'completed',
          metadata: {
            session_id: sessionId,
            duration_minutes: actualDurationMinutes,
            rate_per_minute: sessionData.rate_per_minute,
            platform_fee_percentage: 3
          }
        });

      if (paymentError) {
        console.error('Payment error:', paymentError);
      } else {
        // Update astrologer wallet balance
        await supabase.rpc('increment_wallet_balance', {
          p_user_id: sessionData.astrologer_id,
          p_amount: paymentAmount
        });
      }
    }

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
      durationSeconds: elapsedSeconds || data.duration_seconds,
      amountReleased: data.amount_released,
      paymentToAstrologer: paymentAmount,
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

