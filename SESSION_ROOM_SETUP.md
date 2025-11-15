# Session Room Setup Guide

## Overview
This implementation creates a complete meeting room system where users can only use the session type they booked (chat/voice/video). The UI uses white and orange theme as requested.

## Features Implemented

### 1. **Session Type Enforcement**
- Users can only access the session type they booked
- Chat bookings → Chat interface only
- Voice bookings → Voice call interface only  
- Video bookings → Video call interface only

### 2. **White & Orange UI Theme**
- Clean white background
- Orange accent colors (#FF6B35 / orange-500)
- Modern, minimal design
- No dark blue colors

### 3. **Real-time Communication**
- Socket.IO for real-time messaging and signaling
- WebRTC for peer-to-peer voice/video
- Automatic reconnection handling

### 4. **Session Management**
- Session validation before joining
- Real-time timer showing elapsed and remaining time
- Automatic session tracking in database
- Proper cleanup on session end

## File Structure

```
astro-user-app/
├── app/
│   ├── session/
│   │   └── [token]/
│   │       └── page.tsx          # Main session room page
│   └── api/
│       └── sessions/
│           ├── validate/
│           │   └── route.ts      # Validate session token
│           ├── join/
│           │   └── route.ts      # Join session endpoint
│           └── end/
│               └── route.ts      # End session endpoint
├── socket-server.js              # Socket.IO server
└── package.json                  # Updated with socket scripts
```

## Setup Instructions

### 1. Install Dependencies (Already Done)
```bash
npm install
```

### 2. Configure Environment Variables

Create/update `.env.local` with:

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
SOCKET_PORT=3001

# Your existing Supabase and other variables...
```

### 3. Start the Servers

You need to run TWO servers:

**Terminal 1 - Next.js App:**
```bash
npm run dev
```

**Terminal 2 - Socket.IO Server:**
```bash
npm run dev:socket
```

## How It Works

### 1. Session Creation Flow
```
User books session → Database creates booking → 
Trigger creates webrtc_session → 
User/Astrologer gets unique token
```

### 2. Joining Session Flow
```
User clicks join link with token →
/session/[token] page loads →
Validates token via API →
Shows session type (chat/voice/video) →
User clicks "Join Session" →
Initializes appropriate interface →
Connects to Socket.IO room →
Starts WebRTC if voice/video
```

### 3. Session Types

#### Chat Session
- Text messaging interface
- Real-time message delivery
- Message history
- No audio/video controls

#### Voice Session  
- Audio-only interface
- Mute/unmute controls
- Visual representation (avatars)
- WebRTC audio streaming

#### Video Session
- Video interface with local and remote video
- Camera on/off toggle
- Mute/unmute controls
- WebRTC video streaming

### 4. Session End Flow
```
User clicks "End Session" →
Stops all media tracks →
Closes WebRTC connection →
Disconnects from Socket.IO →
Calls end_session API →
Updates database (duration, status) →
Releases frozen funds →
Redirects to dashboard
```

## Database Functions Used

### `is_session_link_valid(p_token)`
- Validates session token
- Checks expiry
- Returns session details

### `start_session(p_session_id, p_participant_type)`
- Marks participant as joined
- Updates join timestamps
- Starts timer when both joined

### `end_session(p_session_id, p_reason)`
- Calculates actual duration
- Updates session status
- Releases frozen funds
- Records session events

## UI Components

### Session Room Page (`/session/[token]/page.tsx`)

**States:**
- Loading - Validating session
- Error - Invalid/expired session
- Pre-join - Session info and join button
- Active - Session in progress

**Features:**
- Real-time timer (elapsed/remaining)
- Participant status indicators
- Session type-specific interface
- Media controls (based on type)
- End session button

### Color Scheme
```css
Primary: Orange (#FF6B35, orange-500)
Background: White (#FFFFFF)
Text: Gray-900 for headings, Gray-600 for body
Accents: Orange-100 for light backgrounds
Borders: Gray-200
```

## API Endpoints

### POST `/api/sessions/validate`
**Request:**
```json
{
  "token": "session_token_here"
}
```

**Response:**
```json
{
  "valid": true,
  "sessionId": "uuid",
  "roomId": "room_id",
  "sessionType": "chat|voice|video",
  "participantType": "user|astrologer",
  "participantId": "uuid",
  "otherParticipantName": "Name",
  "paidDurationMinutes": 30,
  "status": "scheduled",
  "scheduledStartTime": "2024-01-01T10:00:00"
}
```

### POST `/api/sessions/join`
**Request:**
```json
{
  "sessionId": "uuid",
  "participantType": "user|astrologer"
}
```

**Response:**
```json
{
  "success": true,
  "sessionActive": true,
  "bothJoined": true,
  "message": "Session started"
}
```

### POST `/api/sessions/end`
**Request:**
```json
{
  "sessionId": "uuid",
  "reason": "completed"
}
```

**Response:**
```json
{
  "success": true,
  "durationSeconds": 1800,
  "amountReleased": "97.00",
  "message": "Session ended"
}
```

## Socket.IO Events

### Client → Server

**join-room**
```javascript
socket.emit('join-room', {
  roomId: 'room_id',
  participantType: 'user|astrologer',
  sessionType: 'chat|voice|video'
});
```

**message** (Chat only)
```javascript
socket.emit('message', {
  roomId: 'room_id',
  senderId: 'uuid',
  senderType: 'user|astrologer',
  message: 'Hello',
  timestamp: '2024-01-01T10:00:00'
});
```

**offer/answer/ice-candidate** (WebRTC signaling)
```javascript
socket.emit('offer', { roomId, offer });
socket.emit('answer', { roomId, answer });
socket.emit('ice-candidate', { roomId, candidate });
```

### Server → Client

**participant-joined**
```javascript
socket.on('participant-joined', ({ participantType, timestamp }) => {
  // Other participant joined
});
```

**participant-left**
```javascript
socket.on('participant-left', ({ participantType, timestamp }) => {
  // Other participant left
});
```

**message**
```javascript
socket.on('message', (messageData) => {
  // New message received
});
```

## Testing Guide

### 1. Test Chat Session
```bash
# Create a chat booking in database
# Get the user_token from webrtc_sessions
# Visit: http://localhost:3000/session/[user_token]
# Should show chat interface only
```

### 2. Test Voice Session
```bash
# Create a voice booking
# Get tokens for both user and astrologer
# Open in two browser tabs
# Should show voice interface with mute controls
```

### 3. Test Video Session
```bash
# Create a video booking
# Get tokens for both participants
# Open in two browser tabs
# Should show video interface with camera/mic controls
```

## Troubleshooting

### Socket Connection Failed
- Ensure socket server is running: `npm run dev:socket`
- Check `NEXT_PUBLIC_SOCKET_URL` in .env.local
- Check browser console for errors

### WebRTC Not Working
- Allow camera/microphone permissions
- Check STUN server connectivity
- Ensure both participants are connected

### Session Not Found
- Verify token is correct
- Check session hasn't expired
- Verify webrtc_sessions table has the record

## Production Deployment

### 1. Socket.IO Server
Deploy socket-server.js separately (e.g., on Heroku, Railway, or separate VPS)

### 2. Update Environment Variables
```env
NEXT_PUBLIC_SOCKET_URL="https://your-socket-server.com"
```

### 3. TURN Server (Recommended for Production)
Add TURN servers for better connectivity:
```javascript
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password'
    }
  ]
};
```

## Security Considerations

1. **Token Validation**: Always validate tokens server-side
2. **Session Expiry**: Tokens expire based on link_valid_until
3. **Type Enforcement**: Session type is enforced by UI and validated by token
4. **Media Permissions**: Request only necessary permissions (audio for voice, audio+video for video)
5. **Room Isolation**: Each booking has unique room_id

## Future Enhancements

1. **Recording**: Add session recording capability
2. **Screen Sharing**: For video sessions
3. **File Sharing**: For chat sessions
4. **Reactions**: Quick emoji reactions
5. **Session Notes**: Post-session notes for astrologers
6. **Quality Indicators**: Network quality indicators
7. **Reconnection**: Automatic reconnection on disconnect

## Support

For issues or questions:
1. Check browser console for errors
2. Verify both servers are running
3. Check database for session records
4. Review socket server logs

