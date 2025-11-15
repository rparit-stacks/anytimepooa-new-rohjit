


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."accept_booking"("p_booking_id" "uuid", "p_astrologer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_booking_amount DECIMAL;
  v_user_id UUID;
BEGIN
  -- Get booking details
  SELECT amount, user_id INTO v_booking_amount, v_user_id
  FROM public.bookings
  WHERE id = p_booking_id AND astrologer_id = p_astrologer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Booking not found');
  END IF;

  -- Update booking status
  UPDATE public.bookings
  SET
    astrologer_status = 'accepted',
    status = 'confirmed',
    astrologer_responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- Credit astrologer wallet (97% of amount)
  PERFORM credit_astrologer_wallet(p_astrologer_id, p_booking_id, v_booking_amount, 3.00);

  -- Create notification for user
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    reference_id,
    reference_type
  ) VALUES (
    v_user_id,
    'booking_accepted',
    'Booking Confirmed',
    'Your booking has been accepted! The astrologer is ready for your session.',
    p_booking_id,
    'booking'
  );

  RETURN jsonb_build_object('success', TRUE, 'message', 'Booking accepted successfully');
END;
$$;


ALTER FUNCTION "public"."accept_booking"("p_booking_id" "uuid", "p_astrologer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_astrologer_profile_completion"("p_astrologer_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_completion INT := 0;
  v_total_fields INT := 20;
  v_filled_fields INT := 0;
  v_astrologer RECORD;
  v_has_bank BOOLEAN;
  v_has_schedule BOOLEAN;
  v_has_services BOOLEAN;
BEGIN
  -- Get astrologer data
  SELECT * INTO v_astrologer FROM public.astrologers WHERE id = p_astrologer_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Count filled fields (basic profile)
  IF v_astrologer.name IS NOT NULL AND v_astrologer.name != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_astrologer.email IS NOT NULL AND v_astrologer.email != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_astrologer.phone IS NOT NULL AND v_astrologer.phone != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_astrologer.bio IS NOT NULL AND v_astrologer.bio != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_astrologer.specialization IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_astrologer.experience_years IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_astrologer.languages IS NOT NULL AND array_length(v_astrologer.languages, 1) > 0 THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_astrologer.profile_picture_url IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_astrologer.location IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_astrologer.city IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;

  -- Check rates (at least one service configured)
  IF v_astrologer.rate_video_per_minute IS NOT NULL
     OR v_astrologer.rate_session_per_minute IS NOT NULL
     OR v_astrologer.rate_chat_per_minute IS NOT NULL THEN
    v_filled_fields := v_filled_fields + 2;
  END IF;

  -- Check bank details
  SELECT EXISTS(SELECT 1 FROM public.astrologer_bank_details WHERE astrologer_id = p_astrologer_id) INTO v_has_bank;
  IF v_has_bank THEN v_filled_fields := v_filled_fields + 2; END IF;

  -- Check schedule
  SELECT EXISTS(SELECT 1 FROM public.astrologer_availability_schedule WHERE astrologer_id = p_astrologer_id) INTO v_has_schedule;
  IF v_has_schedule THEN v_filled_fields := v_filled_fields + 2; END IF;

  -- Check services
  SELECT EXISTS(SELECT 1 FROM public.astrologer_services WHERE astrologer_id = p_astrologer_id) INTO v_has_services;
  IF v_has_services THEN v_filled_fields := v_filled_fields + 2; END IF;

  -- Calculate percentage
  v_completion := ROUND((v_filled_fields::DECIMAL / v_total_fields) * 100);

  RETURN v_completion;
END;
$$;


ALTER FUNCTION "public"."calculate_astrologer_profile_completion"("p_astrologer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_join_session"("p_booking_id" "uuid") RETURNS TABLE("can_join" boolean, "message" "text", "status" character varying)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_link_record RECORD;
    v_current_time TIMESTAMP := NOW();
BEGIN
    SELECT * INTO v_link_record
    FROM booking_links
    WHERE booking_id = p_booking_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Invalid or inactive booking link', 'invalid';
        RETURN;
    END IF;

    -- Check if too early
    IF v_current_time < v_link_record.can_join_from THEN
        RETURN QUERY SELECT
            FALSE,
            'Please wait. You can join from ' || TO_CHAR(v_link_record.can_join_from, 'HH12:MI AM'),
            'too_early';
        RETURN;
    END IF;

    -- Check if expired
    IF v_current_time > v_link_record.can_join_until THEN
        RETURN QUERY SELECT FALSE, 'Booking link has expired', 'expired';
        RETURN;
    END IF;

    -- Can join
    RETURN QUERY SELECT TRUE, 'You can join the session', 'ready';
END;
$$;


ALTER FUNCTION "public"."can_join_session"("p_booking_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_join_session_now"("p_booking_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_session RECORD;
  v_current_time TIMESTAMP;
  v_grace_minutes INTEGER := 10; -- Allow joining 10 minutes early
BEGIN
  v_current_time := NOW();
  
  -- Get session details
  SELECT * INTO v_session
  FROM webrtc_sessions
  WHERE booking_id = p_booking_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_join', FALSE,
      'reason', 'Session not found'
    );
  END IF;
  
  -- Check if session is already completed or cancelled
  IF v_session.status IN ('completed', 'cancelled', 'expired') THEN
    RETURN jsonb_build_object(
      'can_join', FALSE,
      'reason', 'Session has ended',
      'status', v_session.status
    );
  END IF;
  
  -- Calculate grace period start time (10 minutes before scheduled)
  DECLARE
    v_grace_start TIMESTAMP;
    v_expiry_time TIMESTAMP;
  BEGIN
    v_grace_start := v_session.scheduled_start_time - (v_grace_minutes || ' minutes')::INTERVAL;
    v_expiry_time := v_session.link_valid_until;
    
    -- Check if current time is within grace period and expiry
    IF v_current_time >= v_grace_start AND v_current_time <= v_expiry_time THEN
      RETURN jsonb_build_object(
        'can_join', TRUE,
        'reason', 'Session is ready to join',
        'scheduled_time', v_session.scheduled_start_time,
        'valid_until', v_session.link_valid_until
      );
    ELSIF v_current_time < v_grace_start THEN
      RETURN jsonb_build_object(
        'can_join', FALSE,
        'reason', 'Too early to join',
        'scheduled_time', v_session.scheduled_start_time,
        'can_join_from', v_grace_start
      );
    ELSE
      RETURN jsonb_build_object(
        'can_join', FALSE,
        'reason', 'Session link has expired',
        'expired_at', v_session.link_valid_until
      );
    END IF;
  END;
END;
$$;


ALTER FUNCTION "public"."can_join_session_now"("p_booking_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_deduct_wallet_balance"("p_user_id" "uuid", "p_amount" numeric, "p_description" "text", "p_booking_id" "uuid" DEFAULT NULL::"uuid", "p_pooja_booking_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_current_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Get current wallet balance
  SELECT balance INTO v_current_balance
  FROM public.wallet_balance
  WHERE user_id = p_user_id;

  -- If wallet doesn't exist, create it with 0 balance
  IF v_current_balance IS NULL THEN
    INSERT INTO public.wallet_balance (user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING balance INTO v_current_balance;
  END IF;

  -- Check if sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'INSUFFICIENT_BALANCE',
      'message', 'Insufficient wallet balance. Please recharge your wallet.',
      'current_balance', v_current_balance,
      'required_amount', p_amount
    );
  END IF;

  -- Deduct balance
  UPDATE public.wallet_balance
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    description,
    status,
    booking_id,
    pooja_booking_id
  )
  VALUES (
    p_user_id,
    'debit',
    p_amount,
    p_description,
    'completed',
    p_booking_id,
    p_pooja_booking_id
  )
  RETURNING id INTO v_transaction_id;

  -- Return success with new balance
  RETURN json_build_object(
    'success', TRUE,
    'transaction_id', v_transaction_id,
    'previous_balance', v_current_balance,
    'deducted_amount', p_amount,
    'new_balance', v_current_balance - p_amount
  );
END;
$$;


ALTER FUNCTION "public"."check_and_deduct_wallet_balance"("p_user_id" "uuid", "p_amount" numeric, "p_description" "text", "p_booking_id" "uuid", "p_pooja_booking_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_and_deduct_wallet_balance"("p_user_id" "uuid", "p_amount" numeric, "p_description" "text", "p_booking_id" "uuid", "p_pooja_booking_id" "uuid") IS 'Checks wallet balance and deducts amount if sufficient';



CREATE OR REPLACE FUNCTION "public"."check_expired_sessions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.webrtc_sessions
  SET status = 'expired',
      updated_at = NOW()
  WHERE status IN ('scheduled', 'waiting')
    AND link_valid_until < NOW();
END;
$$;


ALTER FUNCTION "public"."check_expired_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_12h_to_24h"("time_12h" character varying, "period" character varying) RETURNS time without time zone
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    hour_part INTEGER;
    minute_part INTEGER;
    time_24h TIME;
BEGIN
    hour_part := CAST(SPLIT_PART(time_12h, ':', 1) AS INTEGER);
    minute_part := CAST(SPLIT_PART(time_12h, ':', 2) AS INTEGER);

    IF period = 'PM' AND hour_part != 12 THEN
        hour_part := hour_part + 12;
    ELSIF period = 'AM' AND hour_part = 12 THEN
        hour_part := 0;
    END IF;

    time_24h := MAKE_TIME(hour_part, minute_part, 0);
    RETURN time_24h;
END;
$$;


ALTER FUNCTION "public"."convert_12h_to_24h"("time_12h" character varying, "period" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_booking_link_auto"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_unique_token VARCHAR(255);
    v_link_url TEXT;
    v_scheduled_datetime TIMESTAMP;
    v_link_valid_until TIMESTAMP;
BEGIN
    -- Only proceed if we have the required time fields
    IF NEW.scheduled_date IS NOT NULL AND NEW.scheduled_time_24h IS NOT NULL THEN
        
        -- Generate unique token
        v_unique_token := generate_booking_link();
        
        -- Create link URL (will be updated with actual domain)
        v_link_url := 'https://yourapp.com/session/' || v_unique_token;
        
        -- Combine date and time to get scheduled datetime
        v_scheduled_datetime := NEW.scheduled_date + NEW.scheduled_time_24h;
        
        -- Calculate link validity: scheduled_time + (duration * link_validity_multiplier)
        -- Default multiplier is 3, so link is valid for 3x the booking duration
        v_link_valid_until := v_scheduled_datetime + 
            (NEW.duration_minutes * COALESCE(NEW.link_validity_multiplier, 3) || ' minutes')::INTERVAL;
        
        -- Create booking link for THIS specific session type
        INSERT INTO booking_links (
            booking_id,
            session_type,  -- This will be 'chat', 'voice', or 'video'
            unique_token,
            link_url,
            scheduled_date,
            scheduled_time_12h,
            scheduled_time_24h,
            scheduled_datetime,
            duration_minutes,
            link_valid_from,
            link_valid_until,
            can_join_from,
            can_join_until,
            user_id,
            astrologer_id,
            is_active
        ) VALUES (
            NEW.id,
            NEW.session_type,  -- Automatically uses the booking's session type
            v_unique_token,
            v_link_url,
            NEW.scheduled_date,
            NEW.scheduled_time_12h,
            NEW.scheduled_time_24h,
            v_scheduled_datetime,
            NEW.duration_minutes,
            v_scheduled_datetime,  -- Can join from scheduled time
            v_link_valid_until,    -- Link expires at scheduled_time + (duration * 3)
            v_scheduled_datetime,  -- Can join from scheduled time
            v_link_valid_until,    -- Can join until link expiry
            NEW.user_id,
            NEW.astrologer_id,
            TRUE
        );
        
        -- Update booking with the booking_link_id
        UPDATE bookings
        SET booking_link_id = (
            SELECT id FROM booking_links WHERE booking_id = NEW.id LIMIT 1
        )
        WHERE id = NEW.id;
        
        RAISE NOTICE 'Booking link created for % session, booking_id: %, valid until: %', 
            NEW.session_type, NEW.id, v_link_valid_until;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_booking_link_auto"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_booking_link_auto"() IS 'Automatically creates a booking link when a booking is inserted. Link is valid for duration * 3 (default multiplier).';



CREATE OR REPLACE FUNCTION "public"."credit_astrologer_wallet"("p_astrologer_id" "uuid", "p_booking_id" "uuid", "p_total_amount" numeric, "p_commission_rate" numeric DEFAULT 3.00) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_commission_amount DECIMAL;
  v_astrologer_amount DECIMAL;
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
  v_wallet_exists BOOLEAN;
BEGIN
  -- Calculate amounts
  v_commission_amount := ROUND(p_total_amount * (p_commission_rate / 100), 2);
  v_astrologer_amount := p_total_amount - v_commission_amount;

  -- Check if wallet exists
  SELECT EXISTS(SELECT 1 FROM astrologer_wallet_balance WHERE astrologer_id = p_astrologer_id) INTO v_wallet_exists;

  IF NOT v_wallet_exists THEN
    -- Create wallet with frozen amount
    INSERT INTO astrologer_wallet_balance (
      astrologer_id, 
      balance, 
      total_earnings,
      frozen_amount
    ) VALUES (
      p_astrologer_id, 
      0, -- Balance stays 0 until session completes
      v_astrologer_amount,
      v_astrologer_amount -- Amount is frozen
    );
    v_new_balance := 0;
  ELSE
    -- Update existing wallet - add to frozen amount, not balance
    UPDATE astrologer_wallet_balance
    SET
      total_earnings = total_earnings + v_astrologer_amount,
      frozen_amount = frozen_amount + v_astrologer_amount, -- Freeze the amount
      updated_at = NOW()
    WHERE astrologer_id = p_astrologer_id
    RETURNING balance INTO v_new_balance;
  END IF;

  -- Record transaction as 'pending' (will be completed when session ends)
  INSERT INTO astrologer_wallet_transactions (
    astrologer_id,
    type,
    amount,
    balance_after,
    description,
    reference_type,
    reference_id,
    status,
    metadata
  ) VALUES (
    p_astrologer_id,
    'credit',
    v_astrologer_amount,
    v_new_balance,
    'Payment frozen - Pending session completion',
    'booking',
    p_booking_id,
    'pending', -- Status is pending until session completes
    jsonb_build_object(
      'commission_amount', v_commission_amount,
      'commission_rate', p_commission_rate,
      'total_amount', p_total_amount,
      'frozen', true
    )
  );

  -- Record platform commission
  INSERT INTO platform_commissions (
    booking_id,
    astrologer_id,
    user_id,
    total_amount,
    commission_amount,
    astrologer_amount,
    commission_rate,
    status
  ) SELECT
    p_booking_id,
    p_astrologer_id,
    user_id,
    p_total_amount,
    v_commission_amount,
    v_astrologer_amount,
    p_commission_rate,
    'pending' -- Pending until session completes
  FROM bookings WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'astrologer_amount', v_astrologer_amount,
    'commission_amount', v_commission_amount,
    'frozen_amount', v_astrologer_amount,
    'message', 'Amount frozen until session completion'
  );
END;
$$;


ALTER FUNCTION "public"."credit_astrologer_wallet"("p_astrologer_id" "uuid", "p_booking_id" "uuid", "p_total_amount" numeric, "p_commission_rate" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decline_booking_with_penalty"("p_booking_id" "uuid", "p_astrologer_id" "uuid", "p_decline_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_booking_amount DECIMAL;
  v_user_id UUID;
  v_penalty_amount DECIMAL;
  v_refund_amount DECIMAL;
  v_astrologer_balance DECIMAL;
  v_new_balance DECIMAL;
BEGIN
  -- Get booking details
  SELECT amount, user_id INTO v_booking_amount, v_user_id
  FROM public.bookings
  WHERE id = p_booking_id AND astrologer_id = p_astrologer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Booking not found');
  END IF;

  -- Calculate penalty (1% of booking amount)
  v_penalty_amount := ROUND(v_booking_amount * 0.01, 2);
  v_refund_amount := v_booking_amount; -- Full refund to user

  -- Update booking status
  UPDATE public.bookings
  SET
    astrologer_status = 'declined',
    status = 'cancelled',
    decline_reason = p_decline_reason,
    astrologer_responded_at = NOW(),
    refund_amount = v_refund_amount,
    refund_status = 'completed',
    refunded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- Refund user (add amount back to user wallet)
  UPDATE public.wallet_balance
  SET
    balance = balance + v_refund_amount,
    updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Record user wallet transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    description,
    status,
    booking_id
  ) VALUES (
    v_user_id,
    'credit',
    v_refund_amount,
    'Refund for declined booking',
    'completed',
    p_booking_id
  );

  -- Get astrologer current balance
  SELECT balance INTO v_astrologer_balance
  FROM public.astrologer_wallet_balance
  WHERE astrologer_id = p_astrologer_id;

  IF v_astrologer_balance IS NULL THEN
    v_astrologer_balance := 0;
    INSERT INTO public.astrologer_wallet_balance (astrologer_id, balance, total_earnings)
    VALUES (p_astrologer_id, 0, 0);
  END IF;

  -- Deduct penalty from astrologer wallet
  v_new_balance := v_astrologer_balance - v_penalty_amount;

  UPDATE public.astrologer_wallet_balance
  SET
    balance = v_new_balance,
    updated_at = NOW()
  WHERE astrologer_id = p_astrologer_id;

  -- Record penalty transaction
  INSERT INTO public.astrologer_wallet_transactions (
    astrologer_id,
    type,
    amount,
    balance_after,
    description,
    reference_type,
    reference_id,
    status,
    metadata
  ) VALUES (
    p_astrologer_id,
    'penalty',
    v_penalty_amount,
    v_new_balance,
    'Penalty for declining booking',
    'booking',
    p_booking_id,
    'completed',
    jsonb_build_object('penalty_rate', 1.0, 'booking_amount', v_booking_amount)
  );

  -- Create notification for user
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    reference_id,
    reference_type
  ) VALUES (
    v_user_id,
    'booking_declined',
    'Booking Declined',
    'Your booking has been declined by the astrologer. Full refund of ₹' || v_refund_amount || ' has been credited to your wallet.',
    p_booking_id,
    'booking'
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'refund_amount', v_refund_amount,
    'penalty_amount', v_penalty_amount,
    'astrologer_new_balance', v_new_balance
  );
END;
$$;


ALTER FUNCTION "public"."decline_booking_with_penalty"("p_booking_id" "uuid", "p_astrologer_id" "uuid", "p_decline_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_session"("p_session_id" "uuid", "p_reason" character varying DEFAULT 'completed'::character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_session RECORD;
  v_duration_seconds INTEGER;
  v_release_result JSONB;
BEGIN
  SELECT * INTO v_session FROM webrtc_sessions WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Session not found');
  END IF;

  -- Calculate actual duration
  IF v_session.actual_start_time IS NOT NULL THEN
    v_duration_seconds := EXTRACT(EPOCH FROM (NOW() - v_session.actual_start_time))::INTEGER;
  ELSE
    v_duration_seconds := 0;
  END IF;

  -- Update session status
  UPDATE webrtc_sessions
  SET 
    status = CASE WHEN p_reason = 'completed' THEN 'completed' ELSE 'cancelled' END,
    actual_end_time = NOW(),
    session_duration_seconds = v_duration_seconds,
    updated_at = NOW()
  WHERE id = p_session_id;
  
  -- IMPORTANT: Only update booking to 'completed' if session completed successfully
  -- NEVER auto-cancel bookings - user must explicitly cancel via API
  IF p_reason = 'completed' AND v_session.both_joined = TRUE THEN
    UPDATE bookings
    SET 
      status = 'completed',
      updated_at = NOW()
    WHERE id = v_session.booking_id;
    
    -- Release frozen amount - call the function if it exists
    BEGIN
      SELECT release_frozen_amount(p_session_id) INTO v_release_result;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not release frozen amount: %', SQLERRM;
        v_release_result := jsonb_build_object('amount_released', '0');
    END;
  END IF;

  -- Log event
  INSERT INTO session_events (session_id, event_type, participant_type, metadata)
  VALUES (
    p_session_id, 
    'session_ended', 
    'system', 
    jsonb_build_object(
      'reason', p_reason, 
      'duration_seconds', v_duration_seconds,
      'user_joined', v_session.user_joined,
      'astrologer_joined', v_session.astrologer_joined,
      'both_joined', v_session.both_joined
    )
  );

  RAISE NOTICE '✓ Session ended: % (reason: %)', p_session_id, p_reason;

  RETURN jsonb_build_object(
    'success', TRUE,
    'duration_seconds', v_duration_seconds,
    'amount_released', COALESCE(v_release_result->>'amount_released', '0'),
    'message', 'Session ended'
  );
END;
$$;


ALTER FUNCTION "public"."end_session"("p_session_id" "uuid", "p_reason" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."end_session"("p_session_id" "uuid", "p_reason" character varying) IS 'Ends session and calculates actual duration';



CREATE OR REPLACE FUNCTION "public"."freeze_wallet_on_both_joined"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_freeze_exists BOOLEAN;
    v_booking RECORD;
    v_commission_rate NUMERIC(5,2);
    v_platform_commission NUMERIC(10,2);
    v_astrologer_earning NUMERIC(10,2);
    v_wallet_exists BOOLEAN;
BEGIN
    -- Only proceed if both have just joined
    IF NEW.both_joined = TRUE AND (OLD.both_joined IS NULL OR OLD.both_joined = FALSE) THEN

        -- Check if freeze already exists
        SELECT EXISTS(
            SELECT 1 FROM wallet_freeze_transactions
            WHERE booking_id = NEW.booking_id
        ) INTO v_freeze_exists;

        IF NOT v_freeze_exists THEN
            -- Get booking details
            SELECT * INTO v_booking
            FROM bookings
            WHERE id = NEW.booking_id;

            IF NOT FOUND THEN
                RAISE WARNING 'Booking not found: %', NEW.booking_id;
                RETURN NEW;
            END IF;

            -- Calculate commission
            v_commission_rate := COALESCE(v_booking.commission_rate, 3.00);
            v_platform_commission := (v_booking.amount * v_commission_rate) / 100;
            v_astrologer_earning := v_booking.amount - v_platform_commission;

            -- Ensure astrologer wallet exists
            SELECT EXISTS(
                SELECT 1 FROM astrologer_wallet_balance 
                WHERE astrologer_id = NEW.astrologer_id
            ) INTO v_wallet_exists;

            IF NOT v_wallet_exists THEN
                INSERT INTO astrologer_wallet_balance (
                    astrologer_id, balance, total_earnings, frozen_amount, pending_amount
                ) VALUES (
                    NEW.astrologer_id, 0.00, 0.00, 0.00, 0.00
                );
            END IF;

            -- Create freeze transaction
            INSERT INTO wallet_freeze_transactions (
                booking_id,
                astrologer_id,
                user_id,
                session_id,
                freeze_amount,
                platform_commission,
                astrologer_earning,
                freeze_status,
                both_joined_at,
                session_started_at
            ) VALUES (
                NEW.booking_id,
                NEW.astrologer_id,
                NEW.user_id,
                NEW.id,
                v_booking.amount,
                v_platform_commission,
                v_astrologer_earning,
                'frozen',
                NEW.actual_start_time,
                NEW.actual_start_time
            );

            -- Update astrologer wallet balance - freeze the amount
            UPDATE astrologer_wallet_balance
            SET
                frozen_amount = frozen_amount + v_astrologer_earning,
                pending_amount = pending_amount + v_astrologer_earning,
                updated_at = NOW()
            WHERE astrologer_id = NEW.astrologer_id;

            RAISE NOTICE '✓ Wallet frozen: % for booking %', v_astrologer_earning, NEW.booking_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."freeze_wallet_on_both_joined"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_booking_link"() RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN LOWER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 32));
END;
$$;


ALTER FUNCTION "public"."generate_booking_link"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_booking_reference"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.booking_reference IS NULL THEN
    NEW.booking_reference := 'BKG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 8);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_booking_reference"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_astrologer_performance_metrics"("p_astrologer_id" "uuid", "p_start_date" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_end_date" timestamp without time zone DEFAULT NULL::timestamp without time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_metrics JSONB;
  v_total_bookings INT;
  v_completed_bookings INT;
  v_cancelled_bookings INT;
  v_avg_rating DECIMAL;
  v_total_earnings DECIMAL;
  v_acceptance_rate DECIMAL;
  v_avg_response_time INTERVAL;
BEGIN
  -- Set default dates if not provided
  IF p_start_date IS NULL THEN
    p_start_date := NOW() - INTERVAL '30 days';
  END IF;

  IF p_end_date IS NULL THEN
    p_end_date := NOW();
  END IF;

  -- Calculate metrics
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    AVG(EXTRACT(EPOCH FROM (astrologer_responded_at - created_at)) / 60)::INTERVAL
  INTO
    v_total_bookings,
    v_completed_bookings,
    v_cancelled_bookings,
    v_avg_response_time
  FROM public.bookings
  WHERE astrologer_id = p_astrologer_id
    AND created_at BETWEEN p_start_date AND p_end_date;

  -- Calculate acceptance rate
  IF v_total_bookings > 0 THEN
    v_acceptance_rate := ROUND((v_completed_bookings::DECIMAL / v_total_bookings) * 100, 2);
  ELSE
    v_acceptance_rate := 0;
  END IF;

  -- Get average rating
  SELECT AVG(rating) INTO v_avg_rating
  FROM public.testimonials
  WHERE astrologer_id = p_astrologer_id;

  -- Get total earnings
  SELECT COALESCE(SUM(amount), 0) INTO v_total_earnings
  FROM public.astrologer_wallet_transactions
  WHERE astrologer_id = p_astrologer_id
    AND type = 'credit'
    AND created_at BETWEEN p_start_date AND p_end_date;

  -- Build JSON response
  v_metrics := jsonb_build_object(
    'total_bookings', COALESCE(v_total_bookings, 0),
    'completed_bookings', COALESCE(v_completed_bookings, 0),
    'cancelled_bookings', COALESCE(v_cancelled_bookings, 0),
    'acceptance_rate', COALESCE(v_acceptance_rate, 0),
    'average_rating', COALESCE(v_avg_rating, 0),
    'total_earnings', COALESCE(v_total_earnings, 0),
    'avg_response_time_minutes', COALESCE(EXTRACT(EPOCH FROM v_avg_response_time) / 60, 0)
  );

  RETURN v_metrics;
END;
$$;


ALTER FUNCTION "public"."get_astrologer_performance_metrics"("p_astrologer_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pooja_items_by_location"("p_latitude" numeric, "p_longitude" numeric, "p_max_distance_km" numeric DEFAULT 50) RETURNS TABLE("item_id" "uuid", "item_name" character varying, "item_description" "text", "item_price" numeric, "astrologer_id" "uuid", "astrologer_name" character varying, "astrologer_location" character varying, "distance_km" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.id AS item_id,
    pi.name AS item_name,
    pi.description AS item_description,
    pi.price AS item_price,
    a.id AS astrologer_id,
    a.name AS astrologer_name,
    a.location AS astrologer_location,
    ROUND(
      CAST(
        6371 * acos(
          cos(radians(p_latitude)) *
          cos(radians(a.latitude)) *
          cos(radians(a.longitude) - radians(p_longitude)) +
          sin(radians(p_latitude)) *
          sin(radians(a.latitude))
        ) AS NUMERIC
      ), 2
    ) AS distance_km
  FROM public.pooja_items pi
  JOIN public.astrologers a ON pi.astrologer_id = a.id
  WHERE
    pi.is_available = TRUE
    AND a.is_available = TRUE
    AND (
      pi.location_specific = FALSE
      OR (
        pi.location_specific = TRUE
        AND 6371 * acos(
          cos(radians(p_latitude)) *
          cos(radians(a.latitude)) *
          cos(radians(a.longitude) - radians(p_longitude)) +
          sin(radians(p_latitude)) *
          sin(radians(a.latitude))
        ) <= COALESCE(pi.max_distance_km, p_max_distance_km)
      )
    )
  ORDER BY distance_km;
END;
$$;


ALTER FUNCTION "public"."get_pooja_items_by_location"("p_latitude" numeric, "p_longitude" numeric, "p_max_distance_km" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_pooja_items_by_location"("p_latitude" numeric, "p_longitude" numeric, "p_max_distance_km" numeric) IS 'Returns available pooja items within specified distance from given coordinates';



CREATE OR REPLACE FUNCTION "public"."get_session_time_constraints"("p_session_id" "uuid") RETURNS TABLE("remaining_seconds" integer, "current_duration_seconds" integer, "paid_duration_seconds" integer, "is_overtime" boolean, "should_warn" boolean, "should_terminate" boolean)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_tracking RECORD;
    v_current_duration INTEGER;
    v_remaining INTEGER;
BEGIN
    SELECT * INTO v_tracking
    FROM session_tracking
    WHERE session_id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session tracking not found for session_id: %', p_session_id;
    END IF;
    
    -- Calculate current duration if session is active
    IF v_tracking.tracking_status = 'active' AND v_tracking.actual_start IS NOT NULL THEN
        v_current_duration := EXTRACT(EPOCH FROM (NOW() - v_tracking.actual_start))::INTEGER;
    ELSE
        v_current_duration := COALESCE(v_tracking.duration_seconds, 0);
    END IF;
    
    -- Calculate remaining time
    v_remaining := v_tracking.paid_duration_seconds - v_current_duration;
    
    RETURN QUERY SELECT
        v_remaining,
        v_current_duration,
        v_tracking.paid_duration_seconds,
        (v_remaining < 0),                    -- is_overtime
        (v_remaining <= 300 AND v_remaining > 0),  -- should_warn (5 minutes or less)
        (v_remaining <= 0);                   -- should_terminate
END;
$$;


ALTER FUNCTION "public"."get_session_time_constraints"("p_session_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_session_time_constraints"("p_session_id" "uuid") IS 'Returns real-time time constraints for a session. Used for strict time enforcement.';



CREATE OR REPLACE FUNCTION "public"."is_session_link_valid"("p_token" character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_session RECORD;
  v_is_user BOOLEAN;
BEGIN
  -- Find session by token
  SELECT * INTO v_session
  FROM public.webrtc_sessions
  WHERE user_token = p_token OR astrologer_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'INVALID_TOKEN',
      'message', 'Session not found'
    );
  END IF;

  -- Check if link has expired
  IF NOW() > v_session.link_valid_until THEN
    -- Update session status to expired
    UPDATE public.webrtc_sessions
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_session.id;

    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'LINK_EXPIRED',
      'message', 'Session link expired'
    );
  END IF;

  -- Check if session is already completed
  IF v_session.status IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'SESSION_ENDED',
      'message', 'Session has already ended'
    );
  END IF;

  -- Determine if user or astrologer
  v_is_user := (p_token = v_session.user_token);

  -- Return valid session info
  RETURN jsonb_build_object(
    'valid', TRUE,
    'session_id', v_session.id,
    'room_id', v_session.room_id,
    'session_type', v_session.session_type,
    'paid_duration_minutes', v_session.paid_duration_minutes,
    'participant_type', CASE WHEN v_is_user THEN 'user' ELSE 'astrologer' END,
    'participant_id', CASE WHEN v_is_user THEN v_session.user_id ELSE v_session.astrologer_id END,
    'status', v_session.status,
    'scheduled_start_time', v_session.scheduled_start_time,
    'link_valid_until', v_session.link_valid_until
  );
END;
$$;


ALTER FUNCTION "public"."is_session_link_valid"("p_token" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_session_link_valid"("p_token" character varying) IS 'Validates session token and checks expiry';



CREATE OR REPLACE FUNCTION "public"."notify_astrologer_new_booking"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Notify astrologer about new booking request
  INSERT INTO astrologer_notifications (
    astrologer_id,
    type,
    title,
    message,
    reference_type,
    reference_id,
    priority
  ) VALUES (
    NEW.astrologer_id,
    'new_booking',
    'New Booking Request',
    'You have a new ' || NEW.session_type || ' session booking for ' || NEW.duration_minutes || ' minutes. Amount: ₹' || NEW.amount,
    'booking',
    NEW.id,
    'high'
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_astrologer_new_booking"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_astrologer_wallet_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Notify astrologer about wallet transaction
  INSERT INTO astrologer_notifications (
    astrologer_id,
    type,
    title,
    message,
    reference_type,
    reference_id
  ) VALUES (
    NEW.astrologer_id,
    CASE 
      WHEN NEW.type = 'credit' THEN 'payment_received'
      WHEN NEW.type = 'withdrawal' THEN 'withdrawal_processed'
      ELSE 'wallet_transaction'
    END,
    CASE 
      WHEN NEW.type = 'credit' THEN 'Payment Received'
      WHEN NEW.type = 'withdrawal' THEN 'Withdrawal Processed'
      ELSE 'Wallet Transaction'
    END,
    CASE 
      WHEN NEW.type = 'credit' THEN '₹' || NEW.amount || ' has been credited to your wallet.'
      WHEN NEW.type = 'withdrawal' THEN 'Withdrawal of ₹' || NEW.amount || ' has been processed.'
      ELSE 'Wallet transaction of ₹' || NEW.amount
    END,
    'wallet',
    NEW.id
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_astrologer_wallet_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_booking_cancelled"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_astrologer_name TEXT;
BEGIN
  -- Only trigger if status changed to cancelled
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    -- Get astrologer name
    SELECT name INTO v_astrologer_name FROM astrologers WHERE id = NEW.astrologer_id;
    
    -- Notify user
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      reference_id,
      reference_type
    ) VALUES (
      NEW.user_id,
      'booking_cancelled',
      'Booking Cancelled',
      'Your booking with ' || COALESCE(v_astrologer_name, 'astrologer') || ' has been cancelled. Refund will be processed.',
      NEW.id,
      'booking'
    );
    
    -- Notify astrologer
    INSERT INTO astrologer_notifications (
      astrologer_id,
      type,
      title,
      message,
      reference_type,
      reference_id
    ) VALUES (
      NEW.astrologer_id,
      'booking_cancelled',
      'Booking Cancelled',
      'A booking has been cancelled.',
      'booking',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_booking_cancelled"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_booking_confirmed"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only trigger if status changed to confirmed
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Notify user
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      reference_id,
      reference_type
    ) VALUES (
      NEW.user_id,
      'booking_confirmed',
      'Booking Confirmed!',
      'Your booking has been confirmed by the astrologer. You can join the session now.',
      NEW.id,
      'booking'
    );
    
    -- Notify astrologer
    INSERT INTO astrologer_notifications (
      astrologer_id,
      type,
      title,
      message,
      reference_type,
      reference_id
    ) VALUES (
      NEW.astrologer_id,
      'booking_confirmed',
      'Booking Confirmed',
      'You have confirmed a booking. Get ready for the session!',
      'booking',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_booking_confirmed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_user_booking_created"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Notify user about new booking
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    reference_id,
    reference_type
  ) VALUES (
    NEW.user_id,
    'booking_created',
    'Booking Created Successfully',
    'Your booking with ' || (SELECT name FROM astrologers WHERE id = NEW.astrologer_id) || ' has been created. Waiting for astrologer confirmation.',
    NEW.id,
    'booking'
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_user_booking_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_wallet_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Notify user about wallet transaction
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    reference_id,
    reference_type
  ) VALUES (
    NEW.user_id,
    CASE 
      WHEN NEW.type = 'credit' THEN 'wallet_credit'
      WHEN NEW.type = 'debit' THEN 'wallet_debit'
      ELSE 'wallet_transaction'
    END,
    CASE 
      WHEN NEW.type = 'credit' THEN 'Money Added'
      WHEN NEW.type = 'debit' THEN 'Money Deducted'
      ELSE 'Wallet Transaction'
    END,
    CASE 
      WHEN NEW.type = 'credit' THEN '₹' || NEW.amount || ' has been added to your wallet.'
      WHEN NEW.type = 'debit' THEN '₹' || NEW.amount || ' has been deducted from your wallet.'
      ELSE 'Wallet transaction of ₹' || NEW.amount
    END,
    NEW.id,
    'wallet'
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_wallet_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_auto_cancel"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Prevent automatic cancellation
    -- Only allow manual cancellation
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        -- Log the cancellation
        RAISE NOTICE 'Booking cancelled: % by user action', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_auto_cancel"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refund_on_cancellation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_booking RECORD;
    v_freeze_record RECORD;
    v_wallet_exists BOOLEAN;
BEGIN
    -- Only refund when booking is cancelled
    IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
        
        -- Get booking details
        SELECT * INTO v_booking FROM bookings WHERE id = NEW.id;
        
        IF NOT FOUND THEN
            RAISE WARNING 'Booking not found for refund: %', NEW.id;
            RETURN NEW;
        END IF;

        -- Check if user wallet exists
        SELECT EXISTS(
            SELECT 1 FROM wallet_balance WHERE user_id = v_booking.user_id
        ) INTO v_wallet_exists;

        IF NOT v_wallet_exists THEN
            INSERT INTO wallet_balance (user_id, balance)
            VALUES (v_booking.user_id, 0.00);
        END IF;

        -- Refund to user wallet
        UPDATE wallet_balance
        SET 
            balance = balance + v_booking.amount,
            updated_at = NOW()
        WHERE user_id = v_booking.user_id;

        -- Record refund transaction
        INSERT INTO wallet_transactions (
            user_id,
            type,
            amount,
            description,
            status,
            booking_id
        ) VALUES (
            v_booking.user_id,
            'credit',
            v_booking.amount,
            'Refund for cancelled booking',
            'completed',
            v_booking.id
        );

        -- Release any frozen funds
        SELECT * INTO v_freeze_record
        FROM wallet_freeze_transactions
        WHERE booking_id = v_booking.id
            AND freeze_status = 'frozen';

        IF FOUND THEN
            -- Update freeze transaction
            UPDATE wallet_freeze_transactions
            SET
                freeze_status = 'refunded',
                release_reason = 'cancelled',
                released_at = NOW(),
                updated_at = NOW()
            WHERE id = v_freeze_record.id;

            -- Release frozen amount from astrologer wallet
            UPDATE astrologer_wallet_balance
            SET
                frozen_amount = GREATEST(0, frozen_amount - v_freeze_record.astrologer_earning),
                pending_amount = GREATEST(0, pending_amount - v_freeze_record.astrologer_earning),
                updated_at = NOW()
            WHERE astrologer_id = v_booking.astrologer_id;

            RAISE NOTICE '✓ Frozen funds released due to cancellation: %', v_freeze_record.astrologer_earning;
        END IF;

        -- Update booking refund status
        UPDATE bookings
        SET
            refund_amount = v_booking.amount,
            refund_status = 'completed',
            refunded_at = NOW()
        WHERE id = v_booking.id;

        RAISE NOTICE '✓ Refund processed: % to user %', v_booking.amount, v_booking.user_id;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."refund_on_cancellation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_frozen_amount"("p_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_session RECORD;
  v_booking RECORD;
  v_astrologer_amount NUMERIC(10,2);
  v_transaction_id UUID;
BEGIN
  -- Get session details
  SELECT * INTO v_session FROM webrtc_sessions WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Session not found');
  END IF;
  
  -- Get booking details
  SELECT * INTO v_booking FROM bookings WHERE id = v_session.booking_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Booking not found');
  END IF;
  
  -- Get astrologer amount from platform_commissions
  SELECT astrologer_amount INTO v_astrologer_amount 
  FROM platform_commissions 
  WHERE booking_id = v_booking.id;
  
  -- If no commission record, calculate it
  IF v_astrologer_amount IS NULL THEN
    v_astrologer_amount := v_booking.amount - (v_booking.amount * COALESCE(v_booking.commission_rate, 3.00) / 100);
  END IF;
  
  -- Release frozen amount to balance
  UPDATE astrologer_wallet_balance
  SET
    balance = balance + v_astrologer_amount,
    frozen_amount = GREATEST(0, frozen_amount - v_astrologer_amount),
    updated_at = NOW()
  WHERE astrologer_id = v_booking.astrologer_id;
  
  -- Update transaction status to completed
  UPDATE astrologer_wallet_transactions
  SET
    status = 'completed',
    description = 'Payment released - Session completed',
    updated_at = NOW()
  WHERE reference_id = v_booking.id 
    AND reference_type = 'booking'
    AND status = 'pending';
  
  -- Update platform commission status
  UPDATE platform_commissions
  SET status = 'completed'
  WHERE booking_id = v_booking.id;
  
  -- Notify astrologer
  INSERT INTO astrologer_notifications (
    astrologer_id,
    type,
    title,
    message,
    reference_type,
    reference_id,
    priority
  ) VALUES (
    v_booking.astrologer_id,
    'payment_released',
    'Payment Released',
    '₹' || v_astrologer_amount || ' has been released to your wallet after session completion.',
    'booking',
    v_booking.id,
    'normal'
  );
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'amount_released', v_astrologer_amount,
    'message', 'Frozen amount released successfully'
  );
END;
$$;


ALTER FUNCTION "public"."release_frozen_amount"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_frozen_funds"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_freeze_record RECORD;
    v_new_balance NUMERIC(10,2);
BEGIN
    -- Only release when session is completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

        -- Get freeze transaction
        SELECT * INTO v_freeze_record
        FROM wallet_freeze_transactions
        WHERE booking_id = NEW.booking_id
            AND freeze_status = 'frozen';

        IF FOUND THEN
            -- Update freeze transaction
            UPDATE wallet_freeze_transactions
            SET
                freeze_status = 'released',
                release_reason = 'completed',
                released_at = NOW(),
                session_ended_at = NEW.actual_end_time,
                actual_duration_seconds = NEW.session_duration_seconds,
                updated_at = NOW()
            WHERE id = v_freeze_record.id;

            -- Update astrologer wallet - move from frozen to available
            UPDATE astrologer_wallet_balance
            SET
                frozen_amount = GREATEST(0, frozen_amount - v_freeze_record.astrologer_earning),
                balance = balance + v_freeze_record.astrologer_earning,
                total_earnings = total_earnings + v_freeze_record.astrologer_earning,
                pending_amount = GREATEST(0, pending_amount - v_freeze_record.astrologer_earning),
                updated_at = NOW()
            WHERE astrologer_id = NEW.astrologer_id
            RETURNING balance INTO v_new_balance;

            -- Create wallet transaction record
            INSERT INTO astrologer_wallet_transactions (
                astrologer_id,
                type,
                amount,
                balance_after,
                description,
                status,
                reference_type,
                reference_id
            ) VALUES (
                NEW.astrologer_id,
                'credit',
                v_freeze_record.astrologer_earning,
                v_new_balance,
                'Earnings from ' || NEW.session_type || ' session',
                'completed',
                'booking',
                NEW.booking_id
            );

            RAISE NOTICE '✓ Funds released: % to astrologer %', v_freeze_record.astrologer_earning, NEW.astrologer_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."release_frozen_funds"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_withdrawal"("p_astrologer_id" "uuid", "p_amount" numeric, "p_payment_method" character varying, "p_bank_details" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_current_balance DECIMAL;
  v_pending_amount DECIMAL;
  v_available_balance DECIMAL;
  v_withdrawal_id UUID;
BEGIN
  -- Get current balance and pending amount
  SELECT balance, pending_amount INTO v_current_balance, v_pending_amount
  FROM public.astrologer_wallet_balance
  WHERE astrologer_id = p_astrologer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Wallet not found');
  END IF;

  v_available_balance := v_current_balance - v_pending_amount;

  -- Check if sufficient balance
  IF v_available_balance < p_amount THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Insufficient balance');
  END IF;

  -- Create withdrawal request
  INSERT INTO public.astrologer_withdrawals (
    astrologer_id,
    amount,
    payment_method,
    bank_name,
    account_holder_name,
    account_number,
    ifsc_code,
    upi_id,
    status
  ) VALUES (
    p_astrologer_id,
    p_amount,
    p_payment_method,
    p_bank_details->>'bank_name',
    p_bank_details->>'account_holder_name',
    p_bank_details->>'account_number',
    p_bank_details->>'ifsc_code',
    p_bank_details->>'upi_id',
    'pending'
  ) RETURNING id INTO v_withdrawal_id;

  -- Update pending amount
  UPDATE public.astrologer_wallet_balance
  SET pending_amount = pending_amount + p_amount
  WHERE astrologer_id = p_astrologer_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'withdrawal_id', v_withdrawal_id,
    'message', 'Withdrawal request submitted successfully'
  );
END;
$$;


ALTER FUNCTION "public"."request_withdrawal"("p_astrologer_id" "uuid", "p_amount" numeric, "p_payment_method" character varying, "p_bank_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_session"("p_session_id" "uuid", "p_participant_type" character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_session RECORD;
  v_other_joined BOOLEAN;
  v_both_joined BOOLEAN;
BEGIN
  SELECT * INTO v_session FROM webrtc_sessions WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Session not found');
  END IF;

  -- Update join timestamp and tracking
  IF p_participant_type = 'user' THEN
    UPDATE webrtc_sessions
    SET 
      user_joined_at = NOW(),
      user_joined = TRUE,
      both_joined = CASE WHEN astrologer_joined = TRUE THEN TRUE ELSE FALSE END,
      status = CASE WHEN astrologer_joined_at IS NOT NULL THEN 'active' ELSE 'waiting' END,
      actual_start_time = CASE WHEN astrologer_joined_at IS NOT NULL AND actual_start_time IS NULL THEN NOW() ELSE actual_start_time END,
      updated_at = NOW()
    WHERE id = p_session_id
    RETURNING astrologer_joined, both_joined INTO v_other_joined, v_both_joined;
  ELSE
    UPDATE webrtc_sessions
    SET 
      astrologer_joined_at = NOW(),
      astrologer_joined = TRUE,
      both_joined = CASE WHEN user_joined = TRUE THEN TRUE ELSE FALSE END,
      status = CASE WHEN user_joined_at IS NOT NULL THEN 'active' ELSE 'waiting' END,
      actual_start_time = CASE WHEN user_joined_at IS NOT NULL AND actual_start_time IS NULL THEN NOW() ELSE actual_start_time END,
      updated_at = NOW()
    WHERE id = p_session_id
    RETURNING user_joined, both_joined INTO v_other_joined, v_both_joined;
  END IF;

  -- Log event
  INSERT INTO session_events (session_id, event_type, participant_type, metadata)
  VALUES (
    p_session_id, 
    'participant_joined', 
    p_participant_type, 
    jsonb_build_object(
      'timestamp', NOW(),
      'both_joined', v_both_joined
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'session_active', v_other_joined,
    'both_joined', v_both_joined,
    'message', CASE WHEN v_other_joined THEN 'Session started' ELSE 'Waiting for other participant' END
  );
END;
$$;


ALTER FUNCTION "public"."start_session"("p_session_id" "uuid", "p_participant_type" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."start_session"("p_session_id" "uuid", "p_participant_type" character varying) IS 'Marks participant as joined and starts timer when both present';



CREATE OR REPLACE FUNCTION "public"."track_session_timing"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Create tracking record if both joined
    IF NEW.both_joined = TRUE AND (OLD.both_joined IS NULL OR OLD.both_joined = FALSE) THEN
        
        -- Check if tracking record already exists
        IF NOT EXISTS (SELECT 1 FROM session_tracking WHERE session_id = NEW.id) THEN
            INSERT INTO session_tracking (
                booking_id,
                session_id,
                session_type,
                user_id,
                astrologer_id,
                scheduled_start,
                scheduled_end,
                actual_start,
                user_joined_at,
                astrologer_joined_at,
                both_joined_at,
                paid_duration_seconds,
                tracking_status
            ) VALUES (
                NEW.booking_id,
                NEW.id,
                NEW.session_type,
                NEW.user_id,
                NEW.astrologer_id,
                NEW.scheduled_start_time,
                NEW.scheduled_start_time + (NEW.paid_duration_minutes || ' minutes')::INTERVAL,
                NEW.actual_start_time,
                NEW.user_joined_at,
                NEW.astrologer_joined_at,
                NEW.actual_start_time,
                NEW.paid_duration_minutes * 60,
                'active'
            );
            
            RAISE NOTICE '✓ Session tracking created for session % (% minutes)', NEW.id, NEW.paid_duration_minutes;
        END IF;
    END IF;

    -- Update tracking on session end
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE session_tracking
        SET
            actual_end = NEW.actual_end_time,
            duration_seconds = NEW.session_duration_seconds,
            overtime_seconds = GREATEST(0, NEW.session_duration_seconds - paid_duration_seconds),
            is_within_time_limit = (NEW.session_duration_seconds <= paid_duration_seconds),
            tracking_status = 'completed',
            updated_at = NOW()
        WHERE session_id = NEW.id;
        
        RAISE NOTICE '✓ Session tracking completed for session %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."track_session_timing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_message_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE session_tracking
    SET
        message_count = message_count + 1,
        last_activity_at = NEW.created_at,
        updated_at = NOW()
    WHERE session_id = NEW.session_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_message_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."astrologers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(20),
    "avatar_url" "text",
    "bio" "text",
    "specializations" "text"[] DEFAULT ARRAY[]::"text"[],
    "rating" numeric(3,2) DEFAULT 0,
    "review_count" integer DEFAULT 0,
    "languages" "text"[] DEFAULT ARRAY[]::"text"[],
    "price_per_session" numeric(10,2),
    "location" character varying(255),
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "is_available" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "rate_session_per_minute" numeric(10,2),
    "rate_video_per_minute" numeric(10,2),
    "rate_chat_per_minute" numeric(10,2),
    "password_hash" character varying(255),
    "experience_years" integer,
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "total_reviews" integer DEFAULT 0,
    "specialization" "text",
    "rate_per_session" numeric(10,2),
    "profile_picture_url" "text",
    "city" character varying(255),
    "state" character varying(255),
    "country" character varying(255) DEFAULT 'India'::character varying
);


ALTER TABLE "public"."astrologers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."astrologers"."experience_years" IS 'Years of experience as an astrologer';



COMMENT ON COLUMN "public"."astrologers"."status" IS 'Account status: pending, approved, rejected, suspended';



COMMENT ON COLUMN "public"."astrologers"."total_reviews" IS 'Total number of reviews received';



COMMENT ON COLUMN "public"."astrologers"."specialization" IS 'Primary specialization (singular field used by signup)';



COMMENT ON COLUMN "public"."astrologers"."rate_per_session" IS 'Rate per session in currency units';



CREATE TABLE IF NOT EXISTS "public"."booking_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "session_type" character varying(20) NOT NULL,
    "unique_token" character varying(255) NOT NULL,
    "link_url" "text" NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "scheduled_time_12h" character varying(20) NOT NULL,
    "scheduled_time_24h" time without time zone NOT NULL,
    "scheduled_datetime" timestamp without time zone NOT NULL,
    "duration_minutes" integer NOT NULL,
    "link_valid_from" timestamp without time zone NOT NULL,
    "link_valid_until" timestamp without time zone NOT NULL,
    "can_join_from" timestamp without time zone NOT NULL,
    "can_join_until" timestamp without time zone NOT NULL,
    "user_id" "uuid" NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_used" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "booking_links_session_type_check" CHECK ((("session_type")::"text" = ANY ((ARRAY['chat'::character varying, 'voice'::character varying, 'video'::character varying])::"text"[])))
);


ALTER TABLE "public"."booking_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."booking_links" IS 'Unique booking links for each consultation type with time-based access control';



COMMENT ON COLUMN "public"."booking_links"."scheduled_time_12h" IS 'User-friendly 12-hour format (e.g., 02:30 PM)';



COMMENT ON COLUMN "public"."booking_links"."link_valid_until" IS 'Link expires at scheduled_time + (duration * 3)';



COMMENT ON COLUMN "public"."booking_links"."can_join_from" IS 'Users can join starting from scheduled time';



COMMENT ON COLUMN "public"."booking_links"."can_join_until" IS 'Users can join until scheduled_time + (duration * 3)';



CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "session_date" timestamp without time zone NOT NULL,
    "duration_minutes" integer DEFAULT 30,
    "amount" numeric(10,2),
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "session_type" character varying(20) DEFAULT 'chat'::character varying,
    "booking_reference" character varying(50),
    "user_notified" boolean DEFAULT false,
    "astrologer_notified" boolean DEFAULT false,
    "webrtc_session_id" "uuid",
    "astrologer_status" character varying(20) DEFAULT 'pending'::character varying,
    "astrologer_responded_at" timestamp without time zone,
    "decline_reason" "text",
    "refund_amount" numeric(10,2),
    "refund_status" character varying(20),
    "refunded_at" timestamp without time zone,
    "astrologer_amount" numeric(10,2),
    "platform_commission" numeric(10,2),
    "commission_rate" numeric(5,2) DEFAULT 3.00,
    "scheduled_date" "date",
    "scheduled_time_12h" character varying(20),
    "scheduled_time_24h" time without time zone,
    "time_period" character varying(2),
    "link_validity_multiplier" integer DEFAULT 3,
    "booking_link_id" "uuid",
    CONSTRAINT "bookings_astrologer_status_check" CHECK ((("astrologer_status")::"text" = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'completed'::character varying])::"text"[]))),
    CONSTRAINT "bookings_refund_status_check" CHECK ((("refund_status")::"text" = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying])::"text"[]))),
    CONSTRAINT "bookings_session_type_check" CHECK ((("session_type")::"text" = ANY ((ARRAY['chat'::character varying, 'voice'::character varying, 'video'::character varying])::"text"[])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bookings"."session_type" IS 'Type of booking session: chat, voice, or video';



COMMENT ON COLUMN "public"."bookings"."booking_reference" IS 'Human-readable booking reference number';



COMMENT ON COLUMN "public"."bookings"."scheduled_time_12h" IS 'Time in 12-hour format (e.g., 02:30 PM)';



COMMENT ON COLUMN "public"."bookings"."time_period" IS 'AM or PM';



COMMENT ON COLUMN "public"."bookings"."link_validity_multiplier" IS 'Link valid for duration * this value (default: 3)';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "password_hash" character varying(255) NOT NULL,
    "full_name" character varying(255),
    "phone" character varying(20),
    "avatar_url" "text",
    "bio" "text",
    "location" character varying(255),
    "city" character varying(100),
    "preferred_section" character varying(50) DEFAULT 'offline_app'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "birth_date" character varying(50),
    "birth_time" character varying(50),
    "birth_place" character varying(255),
    "gender" character varying(50),
    "marital_status" character varying(50),
    "password" character varying(255)
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."active_booking_links" AS
 SELECT "bl"."id",
    "bl"."booking_id",
    "bl"."session_type",
    "bl"."unique_token",
    "bl"."link_url",
    "bl"."scheduled_date",
    "bl"."scheduled_time_12h",
    "bl"."scheduled_time_24h",
    "bl"."scheduled_datetime",
    "bl"."duration_minutes",
    "bl"."link_valid_from",
    "bl"."link_valid_until",
    "bl"."can_join_from",
    "bl"."can_join_until",
    "bl"."user_id",
    "bl"."astrologer_id",
    "bl"."is_active",
    "bl"."is_used",
    "bl"."created_at",
    "bl"."updated_at",
    "b"."amount",
    "b"."status" AS "booking_status",
    "u"."full_name" AS "user_name",
    "u"."phone" AS "user_phone",
    "a"."name" AS "astrologer_name",
        CASE
            WHEN ("now"() < "bl"."can_join_from") THEN 'too_early'::"text"
            WHEN ("now"() > "bl"."can_join_until") THEN 'expired'::"text"
            ELSE 'ready'::"text"
        END AS "join_status",
        CASE
            WHEN ("now"() < "bl"."can_join_from") THEN ('Can join from '::"text" || "to_char"("bl"."can_join_from", 'DD Mon, HH12:MI AM'::"text"))
            WHEN ("now"() > "bl"."can_join_until") THEN 'Link expired'::"text"
            ELSE 'Ready to join'::"text"
        END AS "join_message"
   FROM ((("public"."booking_links" "bl"
     JOIN "public"."bookings" "b" ON (("bl"."booking_id" = "b"."id")))
     JOIN "public"."users" "u" ON (("bl"."user_id" = "u"."id")))
     JOIN "public"."astrologers" "a" ON (("bl"."astrologer_id" = "a"."id")))
  WHERE ("bl"."is_active" = true);


ALTER VIEW "public"."active_booking_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "day_of_week" smallint NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "slot_duration_minutes" integer DEFAULT 30,
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "astrologer_availability_day_chk" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "astrologer_availability_slot_chk" CHECK ((("slot_duration_minutes" IS NULL) OR ("slot_duration_minutes" > 0)))
);


ALTER TABLE "public"."astrologer_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_availability_schedule" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "is_available" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "astrologer_availability_schedule_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."astrologer_availability_schedule" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_bank_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "bank_name" character varying(255),
    "account_holder_name" character varying(255) NOT NULL,
    "account_number" character varying(50) NOT NULL,
    "ifsc_code" character varying(20),
    "account_type" character varying(20),
    "branch_name" character varying(255),
    "upi_id" character varying(100),
    "is_primary" boolean DEFAULT true,
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "astrologer_bank_details_account_type_check" CHECK ((("account_type")::"text" = ANY ((ARRAY['savings'::character varying, 'current'::character varying])::"text"[])))
);


ALTER TABLE "public"."astrologer_bank_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "document_type" character varying(50) NOT NULL,
    "document_name" character varying(255) NOT NULL,
    "document_url" "text" NOT NULL,
    "document_number" character varying(100),
    "verification_status" character varying(20) DEFAULT 'pending'::character varying,
    "rejection_reason" "text",
    "verified_at" timestamp without time zone,
    "verified_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "astrologer_documents_document_type_check" CHECK ((("document_type")::"text" = ANY ((ARRAY['aadhaar'::character varying, 'pan'::character varying, 'certificate'::character varying, 'degree'::character varying, 'photo_id'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "astrologer_documents_verification_status_check" CHECK ((("verification_status")::"text" = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "public"."astrologer_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "email_notifications" boolean DEFAULT true,
    "sms_notifications" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT true,
    "booking_requests" boolean DEFAULT true,
    "booking_cancellations" boolean DEFAULT true,
    "payment_received" boolean DEFAULT true,
    "withdrawal_updates" boolean DEFAULT true,
    "promotional_updates" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."astrologer_notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "type" character varying(50) NOT NULL,
    "title" character varying(255) NOT NULL,
    "message" "text" NOT NULL,
    "reference_type" character varying(50),
    "reference_id" "uuid",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp without time zone,
    "action_url" "text",
    "action_label" character varying(50),
    "priority" character varying(20) DEFAULT 'normal'::character varying,
    "metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "expires_at" timestamp without time zone,
    CONSTRAINT "astrologer_notifications_priority_check" CHECK ((("priority")::"text" = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::"text"[])))
);


ALTER TABLE "public"."astrologer_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_otp_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" character varying(15),
    "email" character varying(255),
    "otp" character varying(6) NOT NULL,
    "verified" boolean DEFAULT false,
    "expires_at" timestamp without time zone NOT NULL,
    "attempts" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "metadata" "jsonb"
);


ALTER TABLE "public"."astrologer_otp_verifications" OWNER TO "postgres";


COMMENT ON COLUMN "public"."astrologer_otp_verifications"."metadata" IS 'Stores temporary signup data (name, phone, specialization, etc.) during OTP verification flow';



CREATE TABLE IF NOT EXISTS "public"."astrologer_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "duration_minutes" integer NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "service_type" character varying(50),
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "astrologer_services_service_type_check" CHECK ((("service_type")::"text" = ANY ((ARRAY['consultation'::character varying, 'pooja'::character varying, 'remedies'::character varying, 'other'::character varying])::"text"[])))
);


ALTER TABLE "public"."astrologer_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "token" character varying(255) NOT NULL,
    "device_info" "jsonb",
    "ip_address" character varying(45),
    "expires_at" timestamp without time zone NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "last_active_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."astrologer_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_support_ticket_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "sender_type" character varying(20) NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "attachments" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "astrologer_support_ticket_messages_sender_type_check" CHECK ((("sender_type")::"text" = ANY ((ARRAY['astrologer'::character varying, 'admin'::character varying])::"text"[])))
);


ALTER TABLE "public"."astrologer_support_ticket_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "subject" character varying(255) NOT NULL,
    "description" "text" NOT NULL,
    "category" character varying(50),
    "status" character varying(20) DEFAULT 'open'::character varying,
    "priority" character varying(20) DEFAULT 'medium'::character varying,
    "assigned_to" "uuid",
    "assigned_at" timestamp without time zone,
    "resolution" "text",
    "resolved_at" timestamp without time zone,
    "resolved_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "astrologer_support_tickets_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['technical'::character varying, 'payment'::character varying, 'account'::character varying, 'booking'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "astrologer_support_tickets_priority_check" CHECK ((("priority")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::"text"[]))),
    CONSTRAINT "astrologer_support_tickets_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying])::"text"[])))
);


ALTER TABLE "public"."astrologer_support_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_wallet_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "type" character varying(20) NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "balance_after" numeric(10,2) NOT NULL,
    "description" "text",
    "reference_type" character varying(50),
    "reference_id" "uuid",
    "status" character varying(20) DEFAULT 'completed'::character varying,
    "metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "astrologer_wallet_transactions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying])::"text"[]))),
    CONSTRAINT "astrologer_wallet_transactions_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['credit'::character varying, 'debit'::character varying, 'commission'::character varying, 'penalty'::character varying, 'withdrawal'::character varying, 'refund'::character varying])::"text"[])))
);


ALTER TABLE "public"."astrologer_wallet_transactions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."astrologer_transactions" AS
 SELECT "id",
    "astrologer_id",
    "type",
    "amount",
    "balance_after",
    "description",
    "reference_type",
    "reference_id",
    "status",
    "metadata",
    "created_at",
    "updated_at"
   FROM "public"."astrologer_wallet_transactions";


ALTER VIEW "public"."astrologer_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_wallet_balance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "balance" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "total_earnings" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "total_withdrawals" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "pending_amount" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "frozen_amount" numeric(10,2) DEFAULT 0.00 NOT NULL
);


ALTER TABLE "public"."astrologer_wallet_balance" OWNER TO "postgres";


COMMENT ON COLUMN "public"."astrologer_wallet_balance"."frozen_amount" IS 'Amount frozen until sessions complete';



CREATE TABLE IF NOT EXISTS "public"."astrologer_wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "balance" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "total_earnings" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "pending_amount" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "available_balance" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "total_withdrawn" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."astrologer_wallets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_withdrawals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "bank_name" character varying(255),
    "account_holder_name" character varying(255),
    "account_number" character varying(50),
    "ifsc_code" character varying(20),
    "upi_id" character varying(100),
    "payment_method" character varying(20),
    "requested_at" timestamp without time zone DEFAULT "now"(),
    "processed_at" timestamp without time zone,
    "completed_at" timestamp without time zone,
    "processed_by" "uuid",
    "transaction_id" character varying(255),
    "transaction_screenshot_url" "text",
    "rejection_reason" "text",
    "admin_notes" "text",
    "metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "astrologer_withdrawals_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "astrologer_withdrawals_payment_method_check" CHECK ((("payment_method")::"text" = ANY ((ARRAY['bank_transfer'::character varying, 'upi'::character varying])::"text"[]))),
    CONSTRAINT "astrologer_withdrawals_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'processing'::character varying, 'completed'::character varying, 'rejected'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."astrologer_withdrawals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallet_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" character varying(50),
    "amount" numeric(10,2) NOT NULL,
    "description" "text",
    "status" character varying(50) DEFAULT 'completed'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "booking_id" "uuid",
    "pooja_booking_id" "uuid"
);


ALTER TABLE "public"."wallet_transactions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."wallet_transactions"."booking_id" IS 'Links transaction to a booking';



COMMENT ON COLUMN "public"."wallet_transactions"."pooja_booking_id" IS 'Links transaction to a pooja booking';



CREATE OR REPLACE VIEW "public"."booking_summary" AS
 SELECT "b"."id" AS "booking_id",
    "b"."booking_reference",
    "b"."user_id",
    "u"."full_name" AS "user_name",
    "u"."email" AS "user_email",
    "b"."astrologer_id",
    "a"."name" AS "astrologer_name",
    "b"."session_type",
    "b"."session_date",
    "b"."duration_minutes",
    "b"."amount",
    "b"."status",
    "b"."created_at",
    "wt"."id" AS "transaction_id",
    "wt"."type" AS "transaction_type",
    "wt"."status" AS "transaction_status"
   FROM ((("public"."bookings" "b"
     LEFT JOIN "public"."users" "u" ON (("b"."user_id" = "u"."id")))
     LEFT JOIN "public"."astrologers" "a" ON (("b"."astrologer_id" = "a"."id")))
     LEFT JOIN "public"."wallet_transactions" "wt" ON (("wt"."booking_id" = "b"."id")));


ALTER VIEW "public"."booking_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."horoscopes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" character varying(255),
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "date" integer NOT NULL,
    "hours" integer NOT NULL,
    "minutes" integer NOT NULL,
    "seconds" integer DEFAULT 0,
    "latitude" numeric(10,8) NOT NULL,
    "longitude" numeric(11,8) NOT NULL,
    "timezone" numeric(4,2) NOT NULL,
    "observation_point" character varying(20) DEFAULT 'topocentric'::character varying,
    "ayanamsha" character varying(20) DEFAULT 'lahiri'::character varying,
    "language" character varying(10) DEFAULT 'en'::character varying,
    "horoscope_type" character varying(50) DEFAULT 'vedic'::character varying,
    "chart_type" character varying(50),
    "chart_data" "jsonb",
    "chart_image_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."horoscopes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "astrologer_id" "uuid",
    "type" character varying(50) NOT NULL,
    "title" character varying(255) NOT NULL,
    "message" "text" NOT NULL,
    "reference_id" "uuid",
    "reference_type" character varying(50),
    "is_read" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Stores all user and astrologer notifications';



CREATE TABLE IF NOT EXISTS "public"."offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "discount_percent" integer,
    "discount_amount" numeric(10,2),
    "image_url" "text",
    "valid_from" timestamp without time zone,
    "valid_till" timestamp without time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."otps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "otp" character varying(6) NOT NULL,
    "attempts" integer DEFAULT 0,
    "expires_at" timestamp without time zone NOT NULL,
    "verified" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."otps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_commissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "commission_amount" numeric(10,2) NOT NULL,
    "astrologer_amount" numeric(10,2) NOT NULL,
    "commission_rate" numeric(5,2) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "platform_commissions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'refunded'::character varying])::"text"[])))
);


ALTER TABLE "public"."platform_commissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pooja_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "pooja_service_id" "uuid" NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "booking_date" "date" NOT NULL,
    "booking_time" time without time zone NOT NULL,
    "address" "text" NOT NULL,
    "city" character varying(100) NOT NULL,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "total_amount" numeric(10,2) NOT NULL,
    "astrologer_price" numeric(10,2) NOT NULL,
    "service_price" numeric(10,2) NOT NULL,
    "distance_km" numeric(8,2),
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "special_instructions" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "pooja_item_id" "uuid",
    "booking_reference" character varying(50),
    "user_notified" boolean DEFAULT false,
    "astrologer_notified" boolean DEFAULT false
);


ALTER TABLE "public"."pooja_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pooja_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "image_url" "text",
    "price" numeric(10,2) NOT NULL,
    "duration_hours" integer DEFAULT 2,
    "category" character varying(100),
    "is_available" boolean DEFAULT true,
    "stock_quantity" integer DEFAULT 0,
    "location_specific" boolean DEFAULT false,
    "max_distance_km" numeric(8,2) DEFAULT 50,
    "tags" "text"[] DEFAULT ARRAY[]::"text"[],
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."pooja_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."pooja_items" IS 'Stores pooja items/offerings added by astrologers for e-commerce';



CREATE TABLE IF NOT EXISTS "public"."pooja_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "image_url" "text",
    "base_price" numeric(10,2) NOT NULL,
    "duration_hours" integer DEFAULT 2,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."pooja_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "event_type" character varying(50) NOT NULL,
    "participant_type" character varying(20),
    "participant_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "session_events_participant_type_check" CHECK ((("participant_type")::"text" = ANY ((ARRAY['user'::character varying, 'astrologer'::character varying, 'system'::character varying])::"text"[])))
);


ALTER TABLE "public"."session_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."session_events" IS 'Audit trail for session events';



CREATE TABLE IF NOT EXISTS "public"."session_recordings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "session_type" character varying(20) NOT NULL,
    "recording_url" "text",
    "recording_storage_path" "text",
    "recording_duration_seconds" integer,
    "recording_size_bytes" bigint,
    "recording_format" character varying(20),
    "recording_status" character varying(20) DEFAULT 'processing'::character varying,
    "recording_started_at" timestamp without time zone,
    "recording_completed_at" timestamp without time zone,
    "is_available" boolean DEFAULT false,
    "expiry_date" timestamp without time zone,
    "user_id" "uuid" NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "session_recordings_status_check" CHECK ((("recording_status")::"text" = ANY ((ARRAY['processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'deleted'::character varying])::"text"[]))),
    CONSTRAINT "session_recordings_type_check" CHECK ((("session_type")::"text" = ANY ((ARRAY['voice'::character varying, 'video'::character varying])::"text"[])))
);


ALTER TABLE "public"."session_recordings" OWNER TO "postgres";


COMMENT ON TABLE "public"."session_recordings" IS 'Stores recordings of voice and video consultation sessions';



COMMENT ON COLUMN "public"."session_recordings"."expiry_date" IS 'Recordings auto-delete after expiry (e.g., 30 days)';



CREATE TABLE IF NOT EXISTS "public"."session_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "session_id" "uuid",
    "session_type" character varying(20) NOT NULL,
    "user_id" "uuid" NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "scheduled_start" timestamp without time zone NOT NULL,
    "scheduled_end" timestamp without time zone NOT NULL,
    "actual_start" timestamp without time zone,
    "actual_end" timestamp without time zone,
    "user_joined_at" timestamp without time zone,
    "astrologer_joined_at" timestamp without time zone,
    "both_joined_at" timestamp without time zone,
    "user_left_at" timestamp without time zone,
    "astrologer_left_at" timestamp without time zone,
    "duration_seconds" integer DEFAULT 0,
    "paid_duration_seconds" integer NOT NULL,
    "overtime_seconds" integer DEFAULT 0,
    "is_within_time_limit" boolean DEFAULT true,
    "tracking_status" character varying(20) DEFAULT 'scheduled'::character varying,
    "message_count" integer DEFAULT 0,
    "last_activity_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "session_tracking_status_check" CHECK ((("tracking_status")::"text" = ANY ((ARRAY['scheduled'::character varying, 'waiting_user'::character varying, 'waiting_astrologer'::character varying, 'active'::character varying, 'completed'::character varying, 'expired'::character varying, 'cancelled'::character varying])::"text"[]))),
    CONSTRAINT "session_tracking_type_check" CHECK ((("session_type")::"text" = ANY ((ARRAY['chat'::character varying, 'voice'::character varying, 'video'::character varying])::"text"[])))
);


ALTER TABLE "public"."session_tracking" OWNER TO "postgres";


COMMENT ON TABLE "public"."session_tracking" IS 'Real-time tracking of consultation sessions with strict time monitoring';



COMMENT ON COLUMN "public"."session_tracking"."overtime_seconds" IS 'Seconds beyond paid duration';



COMMENT ON COLUMN "public"."session_tracking"."is_within_time_limit" IS 'FALSE if session exceeded paid duration';



CREATE TABLE IF NOT EXISTS "public"."wallet_freeze_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid",
    "freeze_amount" numeric(10,2) NOT NULL,
    "platform_commission" numeric(10,2) DEFAULT 0.00,
    "astrologer_earning" numeric(10,2) NOT NULL,
    "freeze_status" character varying(20) DEFAULT 'frozen'::character varying,
    "frozen_at" timestamp without time zone DEFAULT "now"(),
    "released_at" timestamp without time zone,
    "release_reason" character varying(50),
    "both_joined_at" timestamp without time zone,
    "session_started_at" timestamp without time zone,
    "session_ended_at" timestamp without time zone,
    "actual_duration_seconds" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "wallet_freeze_release_reason_check" CHECK ((("release_reason")::"text" = ANY ((ARRAY['completed'::character varying, 'cancelled'::character varying, 'expired'::character varying, 'refunded'::character varying, NULL::character varying])::"text"[]))),
    CONSTRAINT "wallet_freeze_status_check" CHECK ((("freeze_status")::"text" = ANY ((ARRAY['frozen'::character varying, 'released'::character varying, 'refunded'::character varying])::"text"[])))
);


ALTER TABLE "public"."wallet_freeze_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."wallet_freeze_transactions" IS 'Tracks automatic wallet freezing when both user and astrologer join session';



COMMENT ON COLUMN "public"."wallet_freeze_transactions"."freeze_amount" IS 'Total amount frozen from user wallet';



COMMENT ON COLUMN "public"."wallet_freeze_transactions"."astrologer_earning" IS 'Amount after platform commission deduction';



CREATE OR REPLACE VIEW "public"."session_history" AS
 SELECT "st"."id" AS "tracking_id",
    "st"."booking_id",
    "st"."session_type",
    "u"."full_name" AS "user_name",
    "a"."name" AS "astrologer_name",
    "st"."scheduled_start",
    "st"."actual_start",
    "st"."actual_end",
    "st"."duration_seconds",
    "st"."paid_duration_seconds",
    "st"."overtime_seconds",
    "st"."is_within_time_limit",
    "st"."message_count",
    "sr"."recording_url",
    "sr"."recording_duration_seconds",
    "sr"."is_available" AS "recording_available",
    "wft"."freeze_amount",
    "wft"."astrologer_earning",
    "wft"."freeze_status"
   FROM (((("public"."session_tracking" "st"
     LEFT JOIN "public"."session_recordings" "sr" ON (("st"."session_id" = "sr"."session_id")))
     LEFT JOIN "public"."wallet_freeze_transactions" "wft" ON (("st"."booking_id" = "wft"."booking_id")))
     JOIN "public"."users" "u" ON (("st"."user_id" = "u"."id")))
     JOIN "public"."astrologers" "a" ON (("st"."astrologer_id" = "a"."id")))
  ORDER BY "st"."scheduled_start" DESC;


ALTER VIEW "public"."session_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "sender_type" character varying(20) NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "message_type" character varying(20) DEFAULT 'text'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "booking_id" "uuid",
    "is_archived" boolean DEFAULT false,
    "read_at" timestamp without time zone,
    "edited_at" timestamp without time zone,
    CONSTRAINT "session_messages_message_type_check" CHECK ((("message_type")::"text" = ANY ((ARRAY['text'::character varying, 'system'::character varying])::"text"[]))),
    CONSTRAINT "session_messages_sender_type_check" CHECK ((("sender_type")::"text" = ANY ((ARRAY['user'::character varying, 'astrologer'::character varying])::"text"[])))
);


ALTER TABLE "public"."session_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."session_messages" IS 'Stores chat messages from WebRTC sessions';



CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" character varying(255) NOT NULL,
    "expires_at" timestamp without time zone NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."testimonials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "astrologer_id" "uuid",
    "rating" integer,
    "review_text" "text",
    "user_avatar_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."testimonials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_slots" (
    "id" integer NOT NULL,
    "time_12h" character varying(20) NOT NULL,
    "time_24h" time without time zone NOT NULL,
    "hour_12" integer NOT NULL,
    "minute" integer NOT NULL,
    "period" character varying(2) NOT NULL,
    "display_label" character varying(30) NOT NULL,
    "sort_order" integer NOT NULL,
    CONSTRAINT "time_slots_hour_check" CHECK ((("hour_12" >= 1) AND ("hour_12" <= 12))),
    CONSTRAINT "time_slots_minute_check" CHECK (("minute" = ANY (ARRAY[0, 15, 30, 45]))),
    CONSTRAINT "time_slots_period_check" CHECK ((("period")::"text" = ANY ((ARRAY['AM'::character varying, 'PM'::character varying])::"text"[])))
);


ALTER TABLE "public"."time_slots" OWNER TO "postgres";


COMMENT ON TABLE "public"."time_slots" IS 'Pre-defined time slots for dropdown selection (15-minute intervals)';



CREATE SEQUENCE IF NOT EXISTS "public"."time_slots_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."time_slots_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."time_slots_id_seq" OWNED BY "public"."time_slots"."id";



CREATE TABLE IF NOT EXISTS "public"."wallet_balance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "balance" numeric(10,2) DEFAULT 0,
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."wallet_balance" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."wallet_freeze_summary" AS
 SELECT "a"."id" AS "astrologer_id",
    "a"."name" AS "astrologer_name",
    "count"("wft"."id") AS "total_freezes",
    "sum"(
        CASE
            WHEN (("wft"."freeze_status")::"text" = 'frozen'::"text") THEN "wft"."astrologer_earning"
            ELSE (0)::numeric
        END) AS "currently_frozen",
    "sum"(
        CASE
            WHEN (("wft"."freeze_status")::"text" = 'released'::"text") THEN "wft"."astrologer_earning"
            ELSE (0)::numeric
        END) AS "total_released",
    "sum"(
        CASE
            WHEN (("wft"."freeze_status")::"text" = 'refunded'::"text") THEN "wft"."astrologer_earning"
            ELSE (0)::numeric
        END) AS "total_refunded"
   FROM ("public"."astrologers" "a"
     LEFT JOIN "public"."wallet_freeze_transactions" "wft" ON (("a"."id" = "wft"."astrologer_id")))
  GROUP BY "a"."id", "a"."name";


ALTER VIEW "public"."wallet_freeze_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webrtc_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "session_type" character varying(20) NOT NULL,
    "paid_duration_minutes" integer NOT NULL,
    "validity_minutes" integer NOT NULL,
    "user_token" character varying(255) NOT NULL,
    "astrologer_token" character varying(255) NOT NULL,
    "room_id" character varying(255) NOT NULL,
    "status" character varying(50) DEFAULT 'scheduled'::character varying,
    "scheduled_start_time" timestamp without time zone NOT NULL,
    "link_valid_until" timestamp without time zone NOT NULL,
    "actual_start_time" timestamp without time zone,
    "actual_end_time" timestamp without time zone,
    "user_joined_at" timestamp without time zone,
    "astrologer_joined_at" timestamp without time zone,
    "user_left_at" timestamp without time zone,
    "astrologer_left_at" timestamp without time zone,
    "session_duration_seconds" integer DEFAULT 0,
    "recording_enabled" boolean DEFAULT false,
    "recording_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "user_joined" boolean DEFAULT false,
    "astrologer_joined" boolean DEFAULT false,
    "both_joined" boolean DEFAULT false,
    CONSTRAINT "webrtc_sessions_session_type_check" CHECK ((("session_type")::"text" = ANY ((ARRAY['chat'::character varying, 'voice'::character varying, 'video'::character varying])::"text"[]))),
    CONSTRAINT "webrtc_sessions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['scheduled'::character varying, 'waiting'::character varying, 'active'::character varying, 'completed'::character varying, 'expired'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."webrtc_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."webrtc_sessions" IS 'Stores WebRTC session information for real-time communication';



COMMENT ON COLUMN "public"."webrtc_sessions"."paid_duration_minutes" IS 'Duration user paid for in minutes';



COMMENT ON COLUMN "public"."webrtc_sessions"."validity_minutes" IS 'Link validity = 3 × paid_duration_minutes';



COMMENT ON COLUMN "public"."webrtc_sessions"."room_id" IS 'Unique room identifier for WebRTC connection';



ALTER TABLE ONLY "public"."time_slots" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."time_slots_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."astrologer_availability"
    ADD CONSTRAINT "astrologer_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_availability_schedule"
    ADD CONSTRAINT "astrologer_availability_sched_astrologer_id_day_of_week_sta_key" UNIQUE ("astrologer_id", "day_of_week", "start_time");



ALTER TABLE ONLY "public"."astrologer_availability_schedule"
    ADD CONSTRAINT "astrologer_availability_schedule_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_bank_details"
    ADD CONSTRAINT "astrologer_bank_details_astrologer_id_account_number_key" UNIQUE ("astrologer_id", "account_number");



ALTER TABLE ONLY "public"."astrologer_bank_details"
    ADD CONSTRAINT "astrologer_bank_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_documents"
    ADD CONSTRAINT "astrologer_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_notification_preferences"
    ADD CONSTRAINT "astrologer_notification_preferences_astrologer_id_key" UNIQUE ("astrologer_id");



ALTER TABLE ONLY "public"."astrologer_notification_preferences"
    ADD CONSTRAINT "astrologer_notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_notifications"
    ADD CONSTRAINT "astrologer_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_otp_verifications"
    ADD CONSTRAINT "astrologer_otp_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_services"
    ADD CONSTRAINT "astrologer_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_sessions"
    ADD CONSTRAINT "astrologer_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_sessions"
    ADD CONSTRAINT "astrologer_sessions_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."astrologer_support_ticket_messages"
    ADD CONSTRAINT "astrologer_support_ticket_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_support_tickets"
    ADD CONSTRAINT "astrologer_support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_wallet_balance"
    ADD CONSTRAINT "astrologer_wallet_balance_astrologer_id_key" UNIQUE ("astrologer_id");



ALTER TABLE ONLY "public"."astrologer_wallet_balance"
    ADD CONSTRAINT "astrologer_wallet_balance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_wallet_transactions"
    ADD CONSTRAINT "astrologer_wallet_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_wallets"
    ADD CONSTRAINT "astrologer_wallets_astrologer_id_key" UNIQUE ("astrologer_id");



ALTER TABLE ONLY "public"."astrologer_wallets"
    ADD CONSTRAINT "astrologer_wallets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_withdrawals"
    ADD CONSTRAINT "astrologer_withdrawals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologers"
    ADD CONSTRAINT "astrologers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."astrologers"
    ADD CONSTRAINT "astrologers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_links"
    ADD CONSTRAINT "booking_links_booking_id_key" UNIQUE ("booking_id");



ALTER TABLE ONLY "public"."booking_links"
    ADD CONSTRAINT "booking_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_links"
    ADD CONSTRAINT "booking_links_unique_token_key" UNIQUE ("unique_token");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_booking_reference_key" UNIQUE ("booking_reference");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."horoscopes"
    ADD CONSTRAINT "horoscopes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."otps"
    ADD CONSTRAINT "otps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_commissions"
    ADD CONSTRAINT "platform_commissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pooja_bookings"
    ADD CONSTRAINT "pooja_bookings_booking_reference_key" UNIQUE ("booking_reference");



ALTER TABLE ONLY "public"."pooja_bookings"
    ADD CONSTRAINT "pooja_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pooja_items"
    ADD CONSTRAINT "pooja_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pooja_services"
    ADD CONSTRAINT "pooja_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_events"
    ADD CONSTRAINT "session_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_messages"
    ADD CONSTRAINT "session_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_recordings"
    ADD CONSTRAINT "session_recordings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_tracking"
    ADD CONSTRAINT "session_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."testimonials"
    ADD CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_slots"
    ADD CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_slots"
    ADD CONSTRAINT "time_slots_time_12h_key" UNIQUE ("time_12h");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_balance"
    ADD CONSTRAINT "wallet_balance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_balance"
    ADD CONSTRAINT "wallet_balance_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."wallet_freeze_transactions"
    ADD CONSTRAINT "wallet_freeze_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webrtc_sessions"
    ADD CONSTRAINT "webrtc_sessions_astrologer_token_key" UNIQUE ("astrologer_token");



ALTER TABLE ONLY "public"."webrtc_sessions"
    ADD CONSTRAINT "webrtc_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webrtc_sessions"
    ADD CONSTRAINT "webrtc_sessions_room_id_key" UNIQUE ("room_id");



ALTER TABLE ONLY "public"."webrtc_sessions"
    ADD CONSTRAINT "webrtc_sessions_user_token_key" UNIQUE ("user_token");



CREATE INDEX "idx_astrologer_availability_astrologer_id" ON "public"."astrologer_availability" USING "btree" ("astrologer_id");



CREATE INDEX "idx_astrologer_availability_day" ON "public"."astrologer_availability" USING "btree" ("day_of_week");



CREATE INDEX "idx_astrologer_bank_details_astrologer_id" ON "public"."astrologer_bank_details" USING "btree" ("astrologer_id");



CREATE INDEX "idx_astrologer_documents_astrologer_id" ON "public"."astrologer_documents" USING "btree" ("astrologer_id");



CREATE INDEX "idx_astrologer_documents_status" ON "public"."astrologer_documents" USING "btree" ("verification_status");



CREATE INDEX "idx_astrologer_documents_type" ON "public"."astrologer_documents" USING "btree" ("document_type");



CREATE INDEX "idx_astrologer_notification_prefs_astrologer_id" ON "public"."astrologer_notification_preferences" USING "btree" ("astrologer_id");



CREATE INDEX "idx_astrologer_notifications_astrologer_id" ON "public"."astrologer_notifications" USING "btree" ("astrologer_id");



CREATE INDEX "idx_astrologer_notifications_created_at" ON "public"."astrologer_notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_astrologer_notifications_is_read" ON "public"."astrologer_notifications" USING "btree" ("is_read");



CREATE INDEX "idx_astrologer_notifications_type" ON "public"."astrologer_notifications" USING "btree" ("type");



CREATE INDEX "idx_astrologer_otp_email" ON "public"."astrologer_otp_verifications" USING "btree" ("email");



CREATE INDEX "idx_astrologer_otp_expires_at" ON "public"."astrologer_otp_verifications" USING "btree" ("expires_at");



CREATE INDEX "idx_astrologer_otp_metadata" ON "public"."astrologer_otp_verifications" USING "gin" ("metadata");



CREATE INDEX "idx_astrologer_otp_phone" ON "public"."astrologer_otp_verifications" USING "btree" ("phone");



CREATE INDEX "idx_astrologer_services_astrologer_id" ON "public"."astrologer_services" USING "btree" ("astrologer_id");



CREATE INDEX "idx_astrologer_services_is_active" ON "public"."astrologer_services" USING "btree" ("is_active");



CREATE INDEX "idx_astrologer_sessions_astrologer_id" ON "public"."astrologer_sessions" USING "btree" ("astrologer_id");



CREATE INDEX "idx_astrologer_sessions_expires_at" ON "public"."astrologer_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_astrologer_sessions_token" ON "public"."astrologer_sessions" USING "btree" ("token");



CREATE INDEX "idx_astrologer_support_ticket_messages_created_at" ON "public"."astrologer_support_ticket_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_astrologer_support_ticket_messages_ticket_id" ON "public"."astrologer_support_ticket_messages" USING "btree" ("ticket_id");



CREATE INDEX "idx_astrologer_support_tickets_astrologer_id" ON "public"."astrologer_support_tickets" USING "btree" ("astrologer_id");



CREATE INDEX "idx_astrologer_support_tickets_created_at" ON "public"."astrologer_support_tickets" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_astrologer_support_tickets_status" ON "public"."astrologer_support_tickets" USING "btree" ("status");



CREATE INDEX "idx_astrologer_wallet_astrologer_id" ON "public"."astrologer_wallet_balance" USING "btree" ("astrologer_id");



CREATE INDEX "idx_astrologer_wallet_balance_astrologer_id" ON "public"."astrologer_wallet_balance" USING "btree" ("astrologer_id");



CREATE INDEX "idx_astrologer_wallet_transactions_astrologer_id" ON "public"."astrologer_wallet_transactions" USING "btree" ("astrologer_id");



CREATE INDEX "idx_astrologer_wallet_transactions_created_at" ON "public"."astrologer_wallet_transactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_astrologer_wallet_transactions_reference" ON "public"."astrologer_wallet_transactions" USING "btree" ("reference_type", "reference_id");



CREATE INDEX "idx_astrologer_wallet_transactions_type" ON "public"."astrologer_wallet_transactions" USING "btree" ("type");



CREATE INDEX "idx_astrologer_wallets_astrologer_id" ON "public"."astrologer_wallets" USING "btree" ("astrologer_id");



CREATE INDEX "idx_astrologer_withdrawals_astrologer_id" ON "public"."astrologer_withdrawals" USING "btree" ("astrologer_id");



CREATE INDEX "idx_astrologer_withdrawals_created_at" ON "public"."astrologer_withdrawals" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_astrologer_withdrawals_status" ON "public"."astrologer_withdrawals" USING "btree" ("status");



CREATE INDEX "idx_astrologers_location" ON "public"."astrologers" USING "btree" ("location");



CREATE INDEX "idx_astrologers_status" ON "public"."astrologers" USING "btree" ("status");



CREATE INDEX "idx_booking_links_booking_id" ON "public"."booking_links" USING "btree" ("booking_id");



CREATE INDEX "idx_booking_links_can_join_from" ON "public"."booking_links" USING "btree" ("can_join_from");



CREATE INDEX "idx_booking_links_can_join_until" ON "public"."booking_links" USING "btree" ("can_join_until");



CREATE INDEX "idx_booking_links_scheduled_datetime" ON "public"."booking_links" USING "btree" ("scheduled_datetime");



CREATE INDEX "idx_booking_links_session_type" ON "public"."booking_links" USING "btree" ("session_type");



CREATE INDEX "idx_booking_links_token" ON "public"."booking_links" USING "btree" ("unique_token");



CREATE INDEX "idx_booking_links_validity" ON "public"."booking_links" USING "btree" ("link_valid_until");



CREATE INDEX "idx_bookings_astrologer_id" ON "public"."bookings" USING "btree" ("astrologer_id");



CREATE INDEX "idx_bookings_reference" ON "public"."bookings" USING "btree" ("booking_reference");



CREATE INDEX "idx_bookings_scheduled_date" ON "public"."bookings" USING "btree" ("scheduled_date");



CREATE INDEX "idx_bookings_scheduled_time" ON "public"."bookings" USING "btree" ("scheduled_time_24h");



CREATE INDEX "idx_bookings_session_type" ON "public"."bookings" USING "btree" ("session_type");



CREATE INDEX "idx_bookings_user_id" ON "public"."bookings" USING "btree" ("user_id");



CREATE INDEX "idx_bookings_webrtc_session_id" ON "public"."bookings" USING "btree" ("webrtc_session_id");



CREATE INDEX "idx_horoscopes_created_at" ON "public"."horoscopes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_horoscopes_user_id" ON "public"."horoscopes" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_astrologer_id" ON "public"."notifications" USING "btree" ("astrologer_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_otps_email" ON "public"."otps" USING "btree" ("email");



CREATE INDEX "idx_platform_commissions_astrologer_id" ON "public"."platform_commissions" USING "btree" ("astrologer_id");



CREATE INDEX "idx_platform_commissions_booking_id" ON "public"."platform_commissions" USING "btree" ("booking_id");



CREATE INDEX "idx_platform_commissions_created_at" ON "public"."platform_commissions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_pooja_bookings_astrologer_id" ON "public"."pooja_bookings" USING "btree" ("astrologer_id");



CREATE INDEX "idx_pooja_bookings_pooja_item_id" ON "public"."pooja_bookings" USING "btree" ("pooja_item_id");



CREATE INDEX "idx_pooja_bookings_reference" ON "public"."pooja_bookings" USING "btree" ("booking_reference");



CREATE INDEX "idx_pooja_bookings_status" ON "public"."pooja_bookings" USING "btree" ("status");



CREATE INDEX "idx_pooja_bookings_user_id" ON "public"."pooja_bookings" USING "btree" ("user_id");



CREATE INDEX "idx_pooja_items_astrologer_id" ON "public"."pooja_items" USING "btree" ("astrologer_id");



CREATE INDEX "idx_pooja_items_category" ON "public"."pooja_items" USING "btree" ("category");



CREATE INDEX "idx_pooja_items_is_available" ON "public"."pooja_items" USING "btree" ("is_available");



CREATE INDEX "idx_pooja_services_is_active" ON "public"."pooja_services" USING "btree" ("is_active");



CREATE INDEX "idx_session_events_created_at" ON "public"."session_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_session_events_event_type" ON "public"."session_events" USING "btree" ("event_type");



CREATE INDEX "idx_session_events_session_id" ON "public"."session_events" USING "btree" ("session_id");



CREATE INDEX "idx_session_messages_booking" ON "public"."session_messages" USING "btree" ("booking_id");



CREATE INDEX "idx_session_messages_created_at" ON "public"."session_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_session_messages_session_id" ON "public"."session_messages" USING "btree" ("session_id");



CREATE INDEX "idx_session_recordings_booking" ON "public"."session_recordings" USING "btree" ("booking_id");



CREATE INDEX "idx_session_recordings_session" ON "public"."session_recordings" USING "btree" ("session_id");



CREATE INDEX "idx_session_recordings_status" ON "public"."session_recordings" USING "btree" ("recording_status");



CREATE INDEX "idx_session_recordings_user" ON "public"."session_recordings" USING "btree" ("user_id");



CREATE INDEX "idx_session_tracking_actual_start" ON "public"."session_tracking" USING "btree" ("actual_start");



CREATE INDEX "idx_session_tracking_astrologer" ON "public"."session_tracking" USING "btree" ("astrologer_id");



CREATE INDEX "idx_session_tracking_booking" ON "public"."session_tracking" USING "btree" ("booking_id");



CREATE INDEX "idx_session_tracking_scheduled" ON "public"."session_tracking" USING "btree" ("scheduled_start");



CREATE INDEX "idx_session_tracking_session" ON "public"."session_tracking" USING "btree" ("session_id");



CREATE INDEX "idx_session_tracking_status" ON "public"."session_tracking" USING "btree" ("tracking_status");



CREATE INDEX "idx_session_tracking_user" ON "public"."session_tracking" USING "btree" ("user_id");



CREATE INDEX "idx_sessions_token" ON "public"."sessions" USING "btree" ("token");



CREATE INDEX "idx_sessions_user_id" ON "public"."sessions" USING "btree" ("user_id");



CREATE INDEX "idx_testimonials_astrologer_id" ON "public"."testimonials" USING "btree" ("astrologer_id");



CREATE INDEX "idx_time_slots_24h" ON "public"."time_slots" USING "btree" ("time_24h");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_wallet_freeze_astrologer" ON "public"."wallet_freeze_transactions" USING "btree" ("astrologer_id");



CREATE INDEX "idx_wallet_freeze_booking" ON "public"."wallet_freeze_transactions" USING "btree" ("booking_id");



CREATE INDEX "idx_wallet_freeze_status" ON "public"."wallet_freeze_transactions" USING "btree" ("freeze_status");



CREATE INDEX "idx_wallet_transactions_booking_id" ON "public"."wallet_transactions" USING "btree" ("booking_id");



CREATE INDEX "idx_wallet_transactions_pooja_booking_id" ON "public"."wallet_transactions" USING "btree" ("pooja_booking_id");



CREATE INDEX "idx_wallet_transactions_user_id" ON "public"."wallet_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_webrtc_sessions_astrologer_id" ON "public"."webrtc_sessions" USING "btree" ("astrologer_id");



CREATE INDEX "idx_webrtc_sessions_astrologer_token" ON "public"."webrtc_sessions" USING "btree" ("astrologer_token");



CREATE INDEX "idx_webrtc_sessions_booking_id" ON "public"."webrtc_sessions" USING "btree" ("booking_id");



CREATE INDEX "idx_webrtc_sessions_link_valid_until" ON "public"."webrtc_sessions" USING "btree" ("link_valid_until");



CREATE INDEX "idx_webrtc_sessions_room_id" ON "public"."webrtc_sessions" USING "btree" ("room_id");



CREATE INDEX "idx_webrtc_sessions_scheduled_time" ON "public"."webrtc_sessions" USING "btree" ("scheduled_start_time");



CREATE INDEX "idx_webrtc_sessions_status" ON "public"."webrtc_sessions" USING "btree" ("status");



CREATE INDEX "idx_webrtc_sessions_user_id" ON "public"."webrtc_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_webrtc_sessions_user_token" ON "public"."webrtc_sessions" USING "btree" ("user_token");



CREATE OR REPLACE TRIGGER "trg_bookings_reference" BEFORE INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."generate_booking_reference"();



CREATE OR REPLACE TRIGGER "trg_pooja_bookings_reference" BEFORE INSERT ON "public"."pooja_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."generate_booking_reference"();



CREATE OR REPLACE TRIGGER "trigger_create_booking_link" AFTER INSERT ON "public"."bookings" FOR EACH ROW WHEN ((("new"."scheduled_date" IS NOT NULL) AND ("new"."scheduled_time_24h" IS NOT NULL))) EXECUTE FUNCTION "public"."create_booking_link_auto"();



CREATE OR REPLACE TRIGGER "trigger_freeze_wallet_on_both_joined" AFTER UPDATE ON "public"."webrtc_sessions" FOR EACH ROW WHEN ((("new"."both_joined" = true) AND (("old"."both_joined" IS NULL) OR ("old"."both_joined" = false)))) EXECUTE FUNCTION "public"."freeze_wallet_on_both_joined"();



CREATE OR REPLACE TRIGGER "trigger_notify_astrologer_new_booking" AFTER INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."notify_astrologer_new_booking"();



CREATE OR REPLACE TRIGGER "trigger_notify_astrologer_wallet_transaction" AFTER INSERT ON "public"."astrologer_wallet_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."notify_astrologer_wallet_transaction"();



CREATE OR REPLACE TRIGGER "trigger_notify_booking_cancelled" AFTER UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."notify_booking_cancelled"();



CREATE OR REPLACE TRIGGER "trigger_notify_booking_confirmed" AFTER UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."notify_booking_confirmed"();



CREATE OR REPLACE TRIGGER "trigger_notify_user_booking_created" AFTER INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."notify_user_booking_created"();



CREATE OR REPLACE TRIGGER "trigger_notify_wallet_transaction" AFTER INSERT ON "public"."wallet_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."notify_wallet_transaction"();



CREATE OR REPLACE TRIGGER "trigger_refund_on_cancellation" AFTER UPDATE ON "public"."bookings" FOR EACH ROW WHEN (((("new"."status")::"text" = 'cancelled'::"text") AND (("old"."status" IS NULL) OR (("old"."status")::"text" <> 'cancelled'::"text")))) EXECUTE FUNCTION "public"."refund_on_cancellation"();



CREATE OR REPLACE TRIGGER "trigger_release_frozen_funds" AFTER UPDATE ON "public"."webrtc_sessions" FOR EACH ROW WHEN (((("new"."status")::"text" = 'completed'::"text") AND (("old"."status" IS NULL) OR (("old"."status")::"text" <> 'completed'::"text")))) EXECUTE FUNCTION "public"."release_frozen_funds"();



CREATE OR REPLACE TRIGGER "trigger_track_session_timing" AFTER UPDATE ON "public"."webrtc_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."track_session_timing"();



CREATE OR REPLACE TRIGGER "trigger_update_message_count" AFTER INSERT ON "public"."session_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_message_count"();



CREATE OR REPLACE TRIGGER "update_astrologer_availability_schedule_updated_at" BEFORE UPDATE ON "public"."astrologer_availability_schedule" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_astrologer_bank_details_updated_at" BEFORE UPDATE ON "public"."astrologer_bank_details" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_astrologer_documents_updated_at" BEFORE UPDATE ON "public"."astrologer_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_astrologer_notification_preferences_updated_at" BEFORE UPDATE ON "public"."astrologer_notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_astrologer_services_updated_at" BEFORE UPDATE ON "public"."astrologer_services" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_astrologer_support_tickets_updated_at" BEFORE UPDATE ON "public"."astrologer_support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_astrologer_wallet_balance_updated_at" BEFORE UPDATE ON "public"."astrologer_wallet_balance" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_astrologer_wallet_transactions_updated_at" BEFORE UPDATE ON "public"."astrologer_wallet_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_astrologer_withdrawals_updated_at" BEFORE UPDATE ON "public"."astrologer_withdrawals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."astrologer_availability"
    ADD CONSTRAINT "astrologer_availability_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_availability_schedule"
    ADD CONSTRAINT "astrologer_availability_schedule_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_bank_details"
    ADD CONSTRAINT "astrologer_bank_details_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_documents"
    ADD CONSTRAINT "astrologer_documents_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_notification_preferences"
    ADD CONSTRAINT "astrologer_notification_preferences_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_notifications"
    ADD CONSTRAINT "astrologer_notifications_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_services"
    ADD CONSTRAINT "astrologer_services_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_sessions"
    ADD CONSTRAINT "astrologer_sessions_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_support_ticket_messages"
    ADD CONSTRAINT "astrologer_support_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."astrologer_support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_support_tickets"
    ADD CONSTRAINT "astrologer_support_tickets_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_wallet_balance"
    ADD CONSTRAINT "astrologer_wallet_balance_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_wallet_transactions"
    ADD CONSTRAINT "astrologer_wallet_transactions_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_wallets"
    ADD CONSTRAINT "astrologer_wallets_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_withdrawals"
    ADD CONSTRAINT "astrologer_withdrawals_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_webrtc_session_id_fkey" FOREIGN KEY ("webrtc_session_id") REFERENCES "public"."webrtc_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."booking_links"
    ADD CONSTRAINT "fk_booking" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_freeze_transactions"
    ADD CONSTRAINT "fk_freeze_astrologer" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_freeze_transactions"
    ADD CONSTRAINT "fk_freeze_booking" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_recordings"
    ADD CONSTRAINT "fk_recording_booking" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_tracking"
    ADD CONSTRAINT "fk_tracking_booking" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."horoscopes"
    ADD CONSTRAINT "horoscopes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_commissions"
    ADD CONSTRAINT "platform_commissions_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id");



ALTER TABLE ONLY "public"."platform_commissions"
    ADD CONSTRAINT "platform_commissions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_commissions"
    ADD CONSTRAINT "platform_commissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."pooja_bookings"
    ADD CONSTRAINT "pooja_bookings_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pooja_bookings"
    ADD CONSTRAINT "pooja_bookings_pooja_item_id_fkey" FOREIGN KEY ("pooja_item_id") REFERENCES "public"."pooja_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pooja_bookings"
    ADD CONSTRAINT "pooja_bookings_pooja_service_id_fkey" FOREIGN KEY ("pooja_service_id") REFERENCES "public"."pooja_services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pooja_bookings"
    ADD CONSTRAINT "pooja_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pooja_items"
    ADD CONSTRAINT "pooja_items_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_events"
    ADD CONSTRAINT "session_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."webrtc_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_messages"
    ADD CONSTRAINT "session_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."webrtc_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."testimonials"
    ADD CONSTRAINT "testimonials_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."testimonials"
    ADD CONSTRAINT "testimonials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_balance"
    ADD CONSTRAINT "wallet_balance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_pooja_booking_id_fkey" FOREIGN KEY ("pooja_booking_id") REFERENCES "public"."pooja_bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webrtc_sessions"
    ADD CONSTRAINT "webrtc_sessions_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webrtc_sessions"
    ADD CONSTRAINT "webrtc_sessions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webrtc_sessions"
    ADD CONSTRAINT "webrtc_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."accept_booking"("p_booking_id" "uuid", "p_astrologer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_booking"("p_booking_id" "uuid", "p_astrologer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_booking"("p_booking_id" "uuid", "p_astrologer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_astrologer_profile_completion"("p_astrologer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_astrologer_profile_completion"("p_astrologer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_astrologer_profile_completion"("p_astrologer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_join_session"("p_booking_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_join_session"("p_booking_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_join_session"("p_booking_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_join_session_now"("p_booking_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_join_session_now"("p_booking_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_join_session_now"("p_booking_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_deduct_wallet_balance"("p_user_id" "uuid", "p_amount" numeric, "p_description" "text", "p_booking_id" "uuid", "p_pooja_booking_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_deduct_wallet_balance"("p_user_id" "uuid", "p_amount" numeric, "p_description" "text", "p_booking_id" "uuid", "p_pooja_booking_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_deduct_wallet_balance"("p_user_id" "uuid", "p_amount" numeric, "p_description" "text", "p_booking_id" "uuid", "p_pooja_booking_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_expired_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_expired_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_expired_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."convert_12h_to_24h"("time_12h" character varying, "period" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."convert_12h_to_24h"("time_12h" character varying, "period" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_12h_to_24h"("time_12h" character varying, "period" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_booking_link_auto"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_booking_link_auto"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_booking_link_auto"() TO "service_role";



GRANT ALL ON FUNCTION "public"."credit_astrologer_wallet"("p_astrologer_id" "uuid", "p_booking_id" "uuid", "p_total_amount" numeric, "p_commission_rate" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."credit_astrologer_wallet"("p_astrologer_id" "uuid", "p_booking_id" "uuid", "p_total_amount" numeric, "p_commission_rate" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."credit_astrologer_wallet"("p_astrologer_id" "uuid", "p_booking_id" "uuid", "p_total_amount" numeric, "p_commission_rate" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."decline_booking_with_penalty"("p_booking_id" "uuid", "p_astrologer_id" "uuid", "p_decline_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decline_booking_with_penalty"("p_booking_id" "uuid", "p_astrologer_id" "uuid", "p_decline_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decline_booking_with_penalty"("p_booking_id" "uuid", "p_astrologer_id" "uuid", "p_decline_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."end_session"("p_session_id" "uuid", "p_reason" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."end_session"("p_session_id" "uuid", "p_reason" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_session"("p_session_id" "uuid", "p_reason" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."freeze_wallet_on_both_joined"() TO "anon";
GRANT ALL ON FUNCTION "public"."freeze_wallet_on_both_joined"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."freeze_wallet_on_both_joined"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_booking_link"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_booking_link"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_booking_link"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_booking_reference"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_booking_reference"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_booking_reference"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_astrologer_performance_metrics"("p_astrologer_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_astrologer_performance_metrics"("p_astrologer_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_astrologer_performance_metrics"("p_astrologer_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pooja_items_by_location"("p_latitude" numeric, "p_longitude" numeric, "p_max_distance_km" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_pooja_items_by_location"("p_latitude" numeric, "p_longitude" numeric, "p_max_distance_km" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pooja_items_by_location"("p_latitude" numeric, "p_longitude" numeric, "p_max_distance_km" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_session_time_constraints"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_session_time_constraints"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_session_time_constraints"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_session_link_valid"("p_token" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."is_session_link_valid"("p_token" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_session_link_valid"("p_token" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_astrologer_new_booking"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_astrologer_new_booking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_astrologer_new_booking"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_astrologer_wallet_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_astrologer_wallet_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_astrologer_wallet_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_booking_cancelled"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_booking_cancelled"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_booking_cancelled"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_booking_confirmed"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_booking_confirmed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_booking_confirmed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_user_booking_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_user_booking_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_user_booking_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_wallet_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_wallet_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_wallet_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_auto_cancel"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_auto_cancel"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_auto_cancel"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refund_on_cancellation"() TO "anon";
GRANT ALL ON FUNCTION "public"."refund_on_cancellation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refund_on_cancellation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."release_frozen_amount"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."release_frozen_amount"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_frozen_amount"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."release_frozen_funds"() TO "anon";
GRANT ALL ON FUNCTION "public"."release_frozen_funds"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_frozen_funds"() TO "service_role";



GRANT ALL ON FUNCTION "public"."request_withdrawal"("p_astrologer_id" "uuid", "p_amount" numeric, "p_payment_method" character varying, "p_bank_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."request_withdrawal"("p_astrologer_id" "uuid", "p_amount" numeric, "p_payment_method" character varying, "p_bank_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_withdrawal"("p_astrologer_id" "uuid", "p_amount" numeric, "p_payment_method" character varying, "p_bank_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."start_session"("p_session_id" "uuid", "p_participant_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."start_session"("p_session_id" "uuid", "p_participant_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_session"("p_session_id" "uuid", "p_participant_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."track_session_timing"() TO "anon";
GRANT ALL ON FUNCTION "public"."track_session_timing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_session_timing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_message_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_message_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_message_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."astrologers" TO "anon";
GRANT ALL ON TABLE "public"."astrologers" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologers" TO "service_role";



GRANT ALL ON TABLE "public"."booking_links" TO "anon";
GRANT ALL ON TABLE "public"."booking_links" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_links" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."active_booking_links" TO "anon";
GRANT ALL ON TABLE "public"."active_booking_links" TO "authenticated";
GRANT ALL ON TABLE "public"."active_booking_links" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_availability" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_availability" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_availability_schedule" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_availability_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_availability_schedule" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_bank_details" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_bank_details" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_bank_details" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_documents" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_documents" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_notifications" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_otp_verifications" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_otp_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_otp_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_services" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_services" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_services" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_sessions" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_support_ticket_messages" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_support_ticket_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_support_ticket_messages" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_wallet_transactions" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_wallet_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_wallet_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_transactions" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_wallet_balance" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_wallet_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_wallet_balance" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_wallets" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_wallets" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_withdrawals" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_withdrawals" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_withdrawals" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_transactions" TO "anon";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."booking_summary" TO "anon";
GRANT ALL ON TABLE "public"."booking_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_summary" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."horoscopes" TO "anon";
GRANT ALL ON TABLE "public"."horoscopes" TO "authenticated";
GRANT ALL ON TABLE "public"."horoscopes" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."offers" TO "anon";
GRANT ALL ON TABLE "public"."offers" TO "authenticated";
GRANT ALL ON TABLE "public"."offers" TO "service_role";



GRANT ALL ON TABLE "public"."otps" TO "anon";
GRANT ALL ON TABLE "public"."otps" TO "authenticated";
GRANT ALL ON TABLE "public"."otps" TO "service_role";



GRANT ALL ON TABLE "public"."platform_commissions" TO "anon";
GRANT ALL ON TABLE "public"."platform_commissions" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_commissions" TO "service_role";



GRANT ALL ON TABLE "public"."pooja_bookings" TO "anon";
GRANT ALL ON TABLE "public"."pooja_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."pooja_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."pooja_items" TO "anon";
GRANT ALL ON TABLE "public"."pooja_items" TO "authenticated";
GRANT ALL ON TABLE "public"."pooja_items" TO "service_role";



GRANT ALL ON TABLE "public"."pooja_services" TO "anon";
GRANT ALL ON TABLE "public"."pooja_services" TO "authenticated";
GRANT ALL ON TABLE "public"."pooja_services" TO "service_role";



GRANT ALL ON TABLE "public"."session_events" TO "anon";
GRANT ALL ON TABLE "public"."session_events" TO "authenticated";
GRANT ALL ON TABLE "public"."session_events" TO "service_role";



GRANT ALL ON TABLE "public"."session_recordings" TO "anon";
GRANT ALL ON TABLE "public"."session_recordings" TO "authenticated";
GRANT ALL ON TABLE "public"."session_recordings" TO "service_role";



GRANT ALL ON TABLE "public"."session_tracking" TO "anon";
GRANT ALL ON TABLE "public"."session_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."session_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_freeze_transactions" TO "anon";
GRANT ALL ON TABLE "public"."wallet_freeze_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_freeze_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."session_history" TO "anon";
GRANT ALL ON TABLE "public"."session_history" TO "authenticated";
GRANT ALL ON TABLE "public"."session_history" TO "service_role";



GRANT ALL ON TABLE "public"."session_messages" TO "anon";
GRANT ALL ON TABLE "public"."session_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."session_messages" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON TABLE "public"."testimonials" TO "anon";
GRANT ALL ON TABLE "public"."testimonials" TO "authenticated";
GRANT ALL ON TABLE "public"."testimonials" TO "service_role";



GRANT ALL ON TABLE "public"."time_slots" TO "anon";
GRANT ALL ON TABLE "public"."time_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."time_slots" TO "service_role";



GRANT ALL ON SEQUENCE "public"."time_slots_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."time_slots_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."time_slots_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_balance" TO "anon";
GRANT ALL ON TABLE "public"."wallet_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_balance" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_freeze_summary" TO "anon";
GRANT ALL ON TABLE "public"."wallet_freeze_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_freeze_summary" TO "service_role";



GRANT ALL ON TABLE "public"."webrtc_sessions" TO "anon";
GRANT ALL ON TABLE "public"."webrtc_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."webrtc_sessions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































