const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Store active rooms and participants
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join room
  socket.on('join-room', async ({ roomId, participantType, sessionType }) => {
    console.log(`${participantType} joining room:`, roomId);
    
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        participants: new Map(),
        sessionType,
        messages: []
      });
    }
    
    const room = rooms.get(roomId);
    room.participants.set(socket.id, { participantType, sessionType });
    
    console.log(`✓ ${participantType} joined room ${roomId}. Total participants: ${room.participants.size}`);
    
    // Notify ALL participants in the room (including sender)
    io.to(roomId).emit('participant-joined', {
      participantType,
      timestamp: new Date().toISOString(),
      totalParticipants: room.participants.size
    });
    
    // Send existing messages to the new participant (for chat)
    if (sessionType === 'chat' && room.messages.length > 0) {
      socket.emit('message-history', room.messages);
    }
    
    // If both participants are now present, notify both
    if (room.participants.size === 2) {
      io.to(roomId).emit('both-participants-ready', {
        message: 'Both participants are connected',
        timestamp: new Date().toISOString()
      });
      console.log(`✓✓ Both participants ready in room ${roomId}`);
    }
  });

  // Handle WebRTC signaling
  socket.on('offer', ({ roomId, offer }) => {
    console.log('Relaying offer for room:', roomId);
    socket.to(roomId).emit('offer', offer);
  });

  socket.on('answer', ({ roomId, answer }) => {
    console.log('Relaying answer for room:', roomId);
    socket.to(roomId).emit('answer', answer);
  });

  socket.on('ice-candidate', ({ roomId, candidate }) => {
    console.log('Relaying ICE candidate for room:', roomId);
    socket.to(roomId).emit('ice-candidate', candidate);
  });

  // Handle typing indicator
  socket.on('typing', ({ roomId, participantType }) => {
    socket.to(roomId).emit('typing', { participantType });
  });

  socket.on('stop-typing', ({ roomId, participantType }) => {
    socket.to(roomId).emit('stop-typing', { participantType });
  });

  // Handle chat messages
  socket.on('message', async ({ roomId, senderId, senderType, message, timestamp }) => {
    console.log('Message in room:', roomId);
    
    const room = rooms.get(roomId);
    if (room) {
      const messageData = {
        senderId,
        senderType,
        message,
        timestamp
      };
      
      // Store message in room history
      room.messages.push(messageData);
      
      // Broadcast to all participants in the room
      io.to(roomId).emit('message', messageData);
      
      // Save message to database
      try {
        // Get session_id from webrtc_sessions using room_id
        const { data: session } = await supabase
          .from('webrtc_sessions')
          .select('id, booking_id')
          .eq('room_id', roomId)
          .single();
        
        if (session) {
          await supabase
            .from('session_messages')
            .insert({
              session_id: session.id,
              booking_id: session.booking_id,
              sender_type: senderType,
              sender_id: senderId,
              message: message,
              message_type: 'text'
            });
        }
      } catch (error) {
        console.error('Error saving message:', error);
      }
    }
  });

  // Handle participant leaving
  socket.on('leave-room', ({ roomId }) => {
    handleLeaveRoom(socket, roomId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Find and clean up rooms
    rooms.forEach((room, roomId) => {
      if (room.participants.has(socket.id)) {
        handleLeaveRoom(socket, roomId);
      }
    });
  });

  function handleLeaveRoom(socket, roomId) {
    const room = rooms.get(roomId);
    if (room) {
      const participant = room.participants.get(socket.id);
      room.participants.delete(socket.id);
      
      console.log(`✗ ${participant?.participantType} left room ${roomId}. Remaining: ${room.participants.size}`);
      
      // Notify ALL remaining participants
      io.to(roomId).emit('participant-left', {
        participantType: participant?.participantType,
        timestamp: new Date().toISOString(),
        totalParticipants: room.participants.size
      });
      
      // Clean up empty rooms
      if (room.participants.size === 0) {
        rooms.delete(roomId);
        console.log(`✗✗ Room ${roomId} cleaned up (empty)`);
      }
    }
    
    socket.leave(roomId);
  }
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

