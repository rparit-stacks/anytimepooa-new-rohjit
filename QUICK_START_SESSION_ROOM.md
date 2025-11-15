# 🚀 Quick Start Guide - Session Room

## Step-by-Step Setup (5 Minutes)

### 1️⃣ Run SQL Setup (1 minute)

Connect to your PostgreSQL database and run:

```bash
psql -h db.hvuerhrxhpdeazlczfxd.supabase.co -U postgres -d postgres -f scripts/session-room-setup.sql
```

Or copy the contents of `scripts/session-room-setup.sql` and run in Supabase SQL Editor.

### 2️⃣ Add Environment Variables (1 minute)

Add these lines to your `.env.local` file:

```env
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
SOCKET_PORT=3001
```

### 3️⃣ Start Both Servers (1 minute)

**Terminal 1 - Next.js:**
```bash
cd astro-user-app
npm run dev
```

**Terminal 2 - Socket.IO:**
```bash
cd astro-user-app
npm run dev:socket
```

You should see:
- Terminal 1: `✓ Ready on http://localhost:3000`
- Terminal 2: `Socket.IO server running on port 3001`

### 4️⃣ Test the System (2 minutes)

#### Option A: Use Existing Booking

1. Find an existing booking in your database:
```sql
SELECT 
    b.id as booking_id,
    b.booking_reference,
    ws.user_token,
    ws.astrologer_token,
    ws.session_type,
    u.full_name as user_name,
    a.name as astrologer_name
FROM bookings b
JOIN webrtc_sessions ws ON b.webrtc_session_id = ws.id
JOIN users u ON b.user_id = u.id
JOIN astrologers a ON b.astrologer_id = a.id
WHERE b.status = 'confirmed'
LIMIT 1;
```

2. Open session as user:
```
http://localhost:3000/session/[user_token]
```

3. Open session as astrologer (in incognito/different browser):
```
http://localhost:3000/session/[astrologer_token]
```

#### Option B: Create Test Booking

Run this SQL to create a test booking:

```sql
-- 1. Create test user (if needed)
INSERT INTO users (email, password_hash, full_name, phone)
VALUES ('testuser@example.com', 'dummy_hash', 'Test User', '9999999999')
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- 2. Get a test astrologer
SELECT id, name FROM astrologers WHERE is_available = true LIMIT 1;

-- 3. Create booking (replace UUIDs with actual IDs)
INSERT INTO bookings (
    user_id,
    astrologer_id,
    session_type,
    session_date,
    scheduled_date,
    scheduled_time_12h,
    scheduled_time_24h,
    duration_minutes,
    amount,
    status
) VALUES (
    'USER_UUID_HERE',
    'ASTROLOGER_UUID_HERE',
    'video', -- or 'chat' or 'voice'
    NOW() + INTERVAL '5 minutes',
    CURRENT_DATE,
    '02:00 PM',
    '14:00:00',
    30,
    500.00,
    'confirmed'
) RETURNING id;

-- 4. The trigger will automatically create webrtc_session
-- Get the tokens:
SELECT 
    user_token,
    astrologer_token,
    session_type
FROM webrtc_sessions
WHERE booking_id = 'BOOKING_ID_FROM_ABOVE'
ORDER BY created_at DESC
LIMIT 1;
```

## 🎨 What You'll See

### Chat Session
- Clean white interface
- Orange message bubbles for your messages
- Gray bubbles for other participant
- Real-time message delivery
- Message timestamps

### Voice Session
- Avatar-based interface (no video)
- Orange accent colors
- Mute/unmute button
- Real-time timer
- Connection status

### Video Session
- Split-screen video layout
- Your video (mirrored)
- Other participant's video
- Camera on/off toggle
- Mute/unmute toggle
- Orange control buttons

## 🔍 Troubleshooting

### "Socket connection failed"
```bash
# Make sure socket server is running
npm run dev:socket

# Check if port 3001 is free
netstat -ano | findstr :3001  # Windows
lsof -i :3001                  # Mac/Linux
```

### "Session not found"
- Check if webrtc_session exists for the booking
- Verify token is correct
- Check if session hasn't expired

### "Cannot access camera/microphone"
- Click "Allow" when browser asks for permissions
- Check browser settings
- Try in Chrome/Edge (best WebRTC support)

### "Other participant not connecting"
- Both must use their respective tokens
- User uses `user_token`
- Astrologer uses `astrologer_token`
- Check both are on same booking

## 📱 Testing Different Session Types

### Test Chat
```sql
UPDATE bookings SET session_type = 'chat' WHERE id = 'YOUR_BOOKING_ID';
```
Reload page - should show chat interface only

### Test Voice
```sql
UPDATE bookings SET session_type = 'voice' WHERE id = 'YOUR_BOOKING_ID';
```
Reload page - should show voice interface with mute button

### Test Video
```sql
UPDATE bookings SET session_type = 'video' WHERE id = 'YOUR_BOOKING_ID';
```
Reload page - should show video interface with camera/mute buttons

## ✅ Success Checklist

- [ ] SQL setup completed (no errors)
- [ ] Environment variables added
- [ ] Next.js server running on port 3000
- [ ] Socket.IO server running on port 3001
- [ ] Can access session page with token
- [ ] Session type matches booking type
- [ ] Can join session
- [ ] Timer starts when both join
- [ ] Can send messages (chat) / hear audio (voice) / see video (video)
- [ ] Can end session successfully
- [ ] Redirects to dashboard after ending

## 🎯 Next Steps

1. **Test All Session Types**: Try chat, voice, and video
2. **Test Timer**: Let session run and watch timer countdown
3. **Test Session End**: End session and verify database updates
4. **Check Wallet**: Verify frozen funds are released after session
5. **Test Notifications**: Check if notifications are created

## 📚 Full Documentation

For detailed documentation, see:
- `SESSION_ROOM_SETUP.md` - Complete technical documentation
- `scripts/session-room-setup.sql` - Database setup with comments

## 🆘 Need Help?

Common issues and solutions:

1. **Port already in use**: Change `SOCKET_PORT` in .env.local
2. **CORS errors**: Check `NEXT_PUBLIC_APP_URL` matches your dev URL
3. **Database errors**: Ensure all tables exist from schema
4. **WebRTC not working**: Try different browsers, check firewall

## 🎨 UI Customization

The UI uses Tailwind CSS. To customize colors:

```typescript
// In session/[token]/page.tsx

// Primary color (currently orange-500)
className="bg-orange-500"  // Change to your color

// Hover states
className="hover:bg-orange-600"  // Adjust accordingly

// Text colors
className="text-orange-500"  // For accent text
```

## 🚀 Production Checklist

Before deploying to production:

- [ ] Deploy Socket.IO server separately
- [ ] Update `NEXT_PUBLIC_SOCKET_URL` to production URL
- [ ] Add TURN servers for better WebRTC connectivity
- [ ] Enable SSL/TLS for socket server
- [ ] Set up monitoring for socket server
- [ ] Test with real users on different networks
- [ ] Add error tracking (Sentry, etc.)
- [ ] Set up session recording (optional)

---

**That's it! You're ready to go! 🎉**

Start both servers and test with a booking. The system will automatically enforce the correct session type based on what was booked.

