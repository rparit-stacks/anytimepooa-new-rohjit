-- Session Room Setup SQL
-- This script ensures all necessary database structures are in place for the session room feature

-- =============================================
-- 1. Ensure webrtc_sessions table has all required columns
-- =============================================

-- Check if user_joined and astrologer_joined columns exist (they should from schema)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'webrtc_sessions' AND column_name = 'user_joined'
    ) THEN
        ALTER TABLE webrtc_sessions ADD COLUMN user_joined BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'webrtc_sessions' AND column_name = 'astrologer_joined'
    ) THEN
        ALTER TABLE webrtc_sessions ADD COLUMN astrologer_joined BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'webrtc_sessions' AND column_name = 'both_joined'
    ) THEN
        ALTER TABLE webrtc_sessions ADD COLUMN both_joined BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- =============================================
-- 2. Create index for faster token lookups
-- =============================================

CREATE INDEX IF NOT EXISTS idx_webrtc_sessions_user_token 
ON webrtc_sessions(user_token);

CREATE INDEX IF NOT EXISTS idx_webrtc_sessions_astrologer_token 
ON webrtc_sessions(astrologer_token);

-- =============================================
-- 3. Ensure session_messages table exists and has booking_id
-- =============================================

-- The table should exist from schema, but let's ensure booking_id is there
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'session_messages' AND column_name = 'booking_id'
    ) THEN
        ALTER TABLE session_messages ADD COLUMN booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================
-- 4. Create helper function to get session by token
-- =============================================

CREATE OR REPLACE FUNCTION get_session_by_token(p_token VARCHAR)
RETURNS TABLE (
    session_id UUID,
    room_id VARCHAR,
    session_type VARCHAR,
    participant_type VARCHAR,
    participant_id UUID,
    booking_id UUID,
    paid_duration_minutes INTEGER,
    status VARCHAR,
    scheduled_start_time TIMESTAMP,
    link_valid_until TIMESTAMP
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_user BOOLEAN;
BEGIN
    -- Find session and determine participant type
    SELECT 
        id,
        room_id,
        session_type,
        CASE 
            WHEN user_token = p_token THEN 'user'
            WHEN astrologer_token = p_token THEN 'astrologer'
            ELSE NULL
        END as participant_type,
        CASE 
            WHEN user_token = p_token THEN user_id
            WHEN astrologer_token = p_token THEN astrologer_id
            ELSE NULL
        END as participant_id,
        booking_id,
        paid_duration_minutes,
        status,
        scheduled_start_time,
        link_valid_until
    INTO
        session_id,
        room_id,
        session_type,
        participant_type,
        participant_id,
        booking_id,
        paid_duration_minutes,
        status,
        scheduled_start_time,
        link_valid_until
    FROM webrtc_sessions
    WHERE user_token = p_token OR astrologer_token = p_token;

    RETURN NEXT;
END;
$$;

-- =============================================
-- 5. Create function to get active sessions for a user/astrologer
-- =============================================

CREATE OR REPLACE FUNCTION get_active_sessions(
    p_participant_id UUID,
    p_participant_type VARCHAR
)
RETURNS TABLE (
    session_id UUID,
    room_id VARCHAR,
    session_type VARCHAR,
    other_participant_name VARCHAR,
    scheduled_start_time TIMESTAMP,
    status VARCHAR,
    user_token VARCHAR,
    astrologer_token VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_participant_type = 'user' THEN
        RETURN QUERY
        SELECT 
            ws.id,
            ws.room_id,
            ws.session_type,
            a.name as other_participant_name,
            ws.scheduled_start_time,
            ws.status,
            ws.user_token,
            ws.astrologer_token
        FROM webrtc_sessions ws
        JOIN astrologers a ON ws.astrologer_id = a.id
        WHERE ws.user_id = p_participant_id
            AND ws.status IN ('scheduled', 'waiting', 'active')
            AND ws.link_valid_until > NOW()
        ORDER BY ws.scheduled_start_time DESC;
    ELSE
        RETURN QUERY
        SELECT 
            ws.id,
            ws.room_id,
            ws.session_type,
            u.full_name as other_participant_name,
            ws.scheduled_start_time,
            ws.status,
            ws.user_token,
            ws.astrologer_token
        FROM webrtc_sessions ws
        JOIN users u ON ws.user_id = u.id
        WHERE ws.astrologer_id = p_participant_id
            AND ws.status IN ('scheduled', 'waiting', 'active')
            AND ws.link_valid_until > NOW()
        ORDER BY ws.scheduled_start_time DESC;
    END IF;
END;
$$;

-- =============================================
-- 6. Create function to get session statistics
-- =============================================

CREATE OR REPLACE FUNCTION get_session_stats(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_stats JSONB;
    v_message_count INTEGER;
    v_duration_seconds INTEGER;
    v_both_joined BOOLEAN;
BEGIN
    -- Get message count for chat sessions
    SELECT COUNT(*) INTO v_message_count
    FROM session_messages
    WHERE session_id = p_session_id;

    -- Get session details
    SELECT 
        session_duration_seconds,
        both_joined
    INTO v_duration_seconds, v_both_joined
    FROM webrtc_sessions
    WHERE id = p_session_id;

    v_stats := jsonb_build_object(
        'message_count', COALESCE(v_message_count, 0),
        'duration_seconds', COALESCE(v_duration_seconds, 0),
        'both_joined', COALESCE(v_both_joined, FALSE)
    );

    RETURN v_stats;
END;
$$;

-- =============================================
-- 7. Update existing is_session_link_valid function if needed
-- =============================================

-- The function already exists in schema, but let's ensure it returns all needed fields
-- (Already properly defined in schem00a.sql)

-- =============================================
-- 8. Create view for active sessions dashboard
-- =============================================

CREATE OR REPLACE VIEW active_sessions_view AS
SELECT 
    ws.id as session_id,
    ws.room_id,
    ws.session_type,
    ws.status,
    ws.scheduled_start_time,
    ws.actual_start_time,
    ws.link_valid_until,
    ws.paid_duration_minutes,
    ws.user_joined,
    ws.astrologer_joined,
    ws.both_joined,
    u.full_name as user_name,
    u.email as user_email,
    a.name as astrologer_name,
    a.email as astrologer_email,
    b.booking_reference,
    b.amount,
    CASE 
        WHEN ws.actual_start_time IS NOT NULL THEN
            EXTRACT(EPOCH FROM (NOW() - ws.actual_start_time))::INTEGER
        ELSE 0
    END as elapsed_seconds,
    CASE 
        WHEN ws.actual_start_time IS NOT NULL THEN
            GREATEST(0, (ws.paid_duration_minutes * 60) - EXTRACT(EPOCH FROM (NOW() - ws.actual_start_time))::INTEGER)
        ELSE ws.paid_duration_minutes * 60
    END as remaining_seconds
FROM webrtc_sessions ws
JOIN users u ON ws.user_id = u.id
JOIN astrologers a ON ws.astrologer_id = a.id
JOIN bookings b ON ws.booking_id = b.id
WHERE ws.status IN ('scheduled', 'waiting', 'active')
    AND ws.link_valid_until > NOW()
ORDER BY ws.scheduled_start_time DESC;

-- =============================================
-- 9. Grant necessary permissions
-- =============================================

GRANT EXECUTE ON FUNCTION get_session_by_token(VARCHAR) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_active_sessions(UUID, VARCHAR) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_session_stats(UUID) TO anon, authenticated, service_role;

GRANT SELECT ON active_sessions_view TO anon, authenticated, service_role;

-- =============================================
-- 10. Create notification trigger for session events
-- =============================================

CREATE OR REPLACE FUNCTION notify_session_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Notify when both participants join
    IF NEW.both_joined = TRUE AND (OLD.both_joined IS NULL OR OLD.both_joined = FALSE) THEN
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
            'session_started',
            'Session Started',
            'Your session has started. Both participants are now connected.',
            NEW.id,
            'session'
        );

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
            NEW.astrologer_id,
            'session_started',
            'Session Started',
            'Your session has started. Both participants are now connected.',
            'session',
            NEW.id,
            'high'
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_notify_session_event ON webrtc_sessions;

CREATE TRIGGER trigger_notify_session_event
    AFTER UPDATE ON webrtc_sessions
    FOR EACH ROW
    EXECUTE FUNCTION notify_session_event();

-- =============================================
-- 11. Create cleanup function for expired sessions
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Update expired sessions
    UPDATE webrtc_sessions
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE status IN ('scheduled', 'waiting')
        AND link_valid_until < NOW();
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN v_updated_count;
END;
$$;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check if all required tables exist
DO $$
BEGIN
    RAISE NOTICE '=== Verification ===';
    
    -- Check webrtc_sessions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webrtc_sessions') THEN
        RAISE NOTICE '✓ webrtc_sessions table exists';
    ELSE
        RAISE WARNING '✗ webrtc_sessions table missing';
    END IF;
    
    -- Check session_messages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_messages') THEN
        RAISE NOTICE '✓ session_messages table exists';
    ELSE
        RAISE WARNING '✗ session_messages table missing';
    END IF;
    
    -- Check functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_session_link_valid') THEN
        RAISE NOTICE '✓ is_session_link_valid function exists';
    ELSE
        RAISE WARNING '✗ is_session_link_valid function missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'start_session') THEN
        RAISE NOTICE '✓ start_session function exists';
    ELSE
        RAISE WARNING '✗ start_session function missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'end_session') THEN
        RAISE NOTICE '✓ end_session function exists';
    ELSE
        RAISE WARNING '✗ end_session function missing';
    END IF;
    
    RAISE NOTICE '=== Setup Complete ===';
END $$;

-- =============================================
-- SAMPLE QUERIES FOR TESTING
-- =============================================

-- Get active sessions for a user
-- SELECT * FROM get_active_sessions('user_uuid_here', 'user');

-- Get active sessions for an astrologer
-- SELECT * FROM get_active_sessions('astrologer_uuid_here', 'astrologer');

-- Validate a session token
-- SELECT * FROM is_session_link_valid('token_here');

-- Get session statistics
-- SELECT * FROM get_session_stats('session_uuid_here');

-- View all active sessions
-- SELECT * FROM active_sessions_view;

-- Cleanup expired sessions
-- SELECT cleanup_expired_sessions();

