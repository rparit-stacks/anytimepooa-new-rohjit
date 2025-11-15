# 🎯 Quick Command Reference

## 🚀 Start Development

```bash
# Terminal 1 - Start Next.js
npm run dev

# Terminal 2 - Start Socket.IO Server
npm run dev:socket
```

## 📦 Install Dependencies

```bash
npm install
```

## 🗄️ Database Setup

```bash
# Connect to PostgreSQL
psql -h db.hvuerhrxhpdeazlczfxd.supabase.co -U postgres -d postgres

# Run setup script
\i scripts/session-room-setup.sql
```

Or in Supabase SQL Editor:
```sql
-- Copy and paste contents of scripts/session-room-setup.sql
```

## 🧪 Test Commands

### Get Active Sessions
```sql
SELECT * FROM active_sessions_view;
```

### Get Session by Token
```sql
SELECT * FROM is_session_link_valid('YOUR_TOKEN_HERE');
```

### Get User's Active Sessions
```sql
SELECT * FROM get_active_sessions('USER_UUID', 'user');
```

### Get Astrologer's Active Sessions
```sql
SELECT * FROM get_active_sessions('ASTROLOGER_UUID', 'astrologer');
```

### Cleanup Expired Sessions
```sql
SELECT cleanup_expired_sessions();
```

## 🔍 Debug Commands

### Check if Socket Server is Running
```bash
# Windows
netstat -ano | findstr :3001

# Mac/Linux
lsof -i :3001
```

### Check Next.js Server
```bash
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000
```

### View Socket Server Logs
```bash
# The logs appear in Terminal 2 where socket server is running
```

### View Next.js Logs
```bash
# The logs appear in Terminal 1 where Next.js is running
```

## 📊 Database Queries

### Find Booking with WebRTC Session
```sql
SELECT 
    b.id,
    b.booking_reference,
    b.session_type,
    ws.user_token,
    ws.astrologer_token,
    ws.status,
    u.full_name as user_name,
    a.name as astrologer_name
FROM bookings b
JOIN webrtc_sessions ws ON b.webrtc_session_id = ws.id
JOIN users u ON b.user_id = u.id
JOIN astrologers a ON b.astrologer_id = a.id
WHERE b.status = 'confirmed'
ORDER BY b.created_at DESC
LIMIT 5;
```

### Create Test Booking
```sql
-- Get test user
SELECT id FROM users WHERE email = 'testuser@example.com' LIMIT 1;

-- Get test astrologer
SELECT id FROM astrologers WHERE is_available = true LIMIT 1;

-- Create booking (replace UUIDs)
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
    'USER_UUID',
    'ASTROLOGER_UUID',
    'video',
    NOW() + INTERVAL '5 minutes',
    CURRENT_DATE,
    '02:00 PM',
    '14:00:00',
    30,
    500.00,
    'confirmed'
) RETURNING id;
```

### Get Session Tokens
```sql
SELECT 
    user_token,
    astrologer_token,
    session_type,
    status
FROM webrtc_sessions
WHERE booking_id = 'BOOKING_ID'
ORDER BY created_at DESC
LIMIT 1;
```

### Check Session Status
```sql
SELECT 
    id,
    status,
    user_joined,
    astrologer_joined,
    both_joined,
    actual_start_time,
    session_duration_seconds
FROM webrtc_sessions
WHERE id = 'SESSION_ID';
```

### View Session Messages
```sql
SELECT 
    sender_type,
    message,
    created_at
FROM session_messages
WHERE session_id = 'SESSION_ID'
ORDER BY created_at;
```

## 🌐 URLs

### Access Session (User)
```
http://localhost:3000/session/[USER_TOKEN]
```

### Access Session (Astrologer)
```
http://localhost:3000/session/[ASTROLOGER_TOKEN]
```

### Dashboard
```
http://localhost:3000/dashboard
```

### Bookings
```
http://localhost:3000/bookings
```

## 🛠️ Build & Deploy

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Start Production Socket Server
```bash
npm run start:socket
```

## 🔧 Environment Variables

### Required Variables
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
SOCKET_PORT=3001
NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

## 🐛 Troubleshooting Commands

### Clear Node Modules
```bash
rm -rf node_modules
npm install
```

### Clear Next.js Cache
```bash
rm -rf .next
npm run dev
```

### Check Node Version
```bash
node --version
# Should be 18.x or higher
```

### Check NPM Version
```bash
npm --version
```

### Kill Process on Port 3000
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Kill Process on Port 3001
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID [PID_NUMBER] /F

# Mac/Linux
lsof -ti:3001 | xargs kill -9
```

## 📝 Git Commands

### Commit Changes
```bash
git add .
git commit -m "Add session room implementation"
git push
```

### Create Branch
```bash
git checkout -b feature/session-room
```

### View Status
```bash
git status
```

## 🎨 Quick Customization

### Change Primary Color
```typescript
// In session/[token]/page.tsx
// Find: bg-orange-500
// Replace with: bg-[your-color]-500
```

### Change Timer Position
```typescript
// In session/[token]/page.tsx
// Find: <div className="flex items-center space-x-6">
// Modify parent flex classes
```

### Change Message Bubble Colors
```typescript
// In session/[token]/page.tsx
// Find: bg-orange-500 (your messages)
// Find: bg-gray-100 (other messages)
```

## 📚 Documentation Files

- `SESSION_ROOM_SETUP.md` - Complete technical documentation
- `QUICK_START_SESSION_ROOM.md` - Quick start guide
- `IMPLEMENTATION_SUMMARY.md` - Implementation overview
- `COMMANDS.md` - This file

## 🎯 Quick Test Sequence

```bash
# 1. Start servers
npm run dev          # Terminal 1
npm run dev:socket   # Terminal 2

# 2. Get a booking token from database
# (Use SQL query from above)

# 3. Open in browser
http://localhost:3000/session/[TOKEN]

# 4. Join session

# 5. Open in incognito with other token
http://localhost:3000/session/[OTHER_TOKEN]

# 6. Test functionality

# 7. End session

# 8. Check database for updates
```

## 🚀 One-Command Setup

```bash
# Run all setup at once (after SQL setup)
npm install && npm run dev & npm run dev:socket
```

---

**Need help?** Check the full documentation in `SESSION_ROOM_SETUP.md`

