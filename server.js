/**
 * Custom Next.js Server with Socket.io for WebRTC Signaling
 * This server handles WebRTC signaling for real-time sessions
 */

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Store active rooms and participants
const activeRooms = new Map()
const participantSockets = new Map()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io/',
  })

  // Socket.io connection handler
  io.on('connection', (socket) => {
    console.log('[Socket.io] Client connected:', socket.id)

    // Join room
    socket.on('join-room', ({ roomId, participantType, participantId, sessionType }) => {
      console.log(`[Socket.io] ${participantType} joining room:`, roomId)

      // Leave any previous rooms
      const previousRooms = Array.from(socket.rooms).filter(r => r !== socket.id)
      previousRooms.forEach(room => socket.leave(room))

      // Join new room
      socket.join(roomId)

      // Store participant info
      participantSockets.set(socket.id, {
        roomId,
        participantType,
        participantId,
        sessionType,
      })

      // Initialize or update room
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, {
          participants: new Map(),
          sessionType,
          createdAt: new Date(),
        })
      }

      const room = activeRooms.get(roomId)
      room.participants.set(participantType, {
        socketId: socket.id,
        participantId,
        joinedAt: new Date(),
      })

      // Notify room about new participant
      socket.to(roomId).emit('participant-joined', {
        participantType,
        participantId,
        sessionType,
      })

      // Send current room state to the joining participant
      const otherParticipant = Array.from(room.participants.entries()).find(
        ([type]) => type !== participantType
      )

      socket.emit('room-joined', {
        roomId,
        participantType,
        otherParticipantPresent: !!otherParticipant,
        otherParticipantType: otherParticipant ? otherParticipant[0] : null,
      })

      console.log(`[Socket.io] Room ${roomId} now has ${room.participants.size} participant(s)`)
    })

    // WebRTC Signaling: Offer
    socket.on('webrtc-offer', ({ roomId, offer, targetParticipantType }) => {
      console.log(`[Socket.io] Forwarding offer in room ${roomId}`)
      socket.to(roomId).emit('webrtc-offer', {
        offer,
        senderSocketId: socket.id,
      })
    })

    // WebRTC Signaling: Answer
    socket.on('webrtc-answer', ({ roomId, answer }) => {
      console.log(`[Socket.io] Forwarding answer in room ${roomId}`)
      socket.to(roomId).emit('webrtc-answer', {
        answer,
        senderSocketId: socket.id,
      })
    })

    // WebRTC Signaling: ICE Candidate
    socket.on('webrtc-ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('webrtc-ice-candidate', {
        candidate,
        senderSocketId: socket.id,
      })
    })

    // Chat message via signaling (backup for DataChannel)
    socket.on('chat-message', ({ roomId, message, senderType, senderId }) => {
      console.log(`[Socket.io] Chat message in room ${roomId}`)
      io.to(roomId).emit('chat-message', {
        message,
        senderType,
        senderId,
        timestamp: new Date().toISOString(),
      })
    })

    // Session timer sync
    socket.on('sync-timer', ({ roomId, timeRemaining }) => {
      socket.to(roomId).emit('timer-sync', { timeRemaining })
    })

    // Media state changes (mute/unmute, video on/off)
    socket.on('media-state-change', ({ roomId, mediaType, enabled }) => {
      const participant = participantSockets.get(socket.id)
      if (participant) {
        socket.to(roomId).emit('participant-media-state', {
          participantType: participant.participantType,
          mediaType,
          enabled,
        })
      }
    })

    // Leave room
    socket.on('leave-room', ({ roomId }) => {
      handleLeaveRoom(socket, roomId)
    })

    // Disconnect
    socket.on('disconnect', () => {
      console.log('[Socket.io] Client disconnected:', socket.id)

      const participant = participantSockets.get(socket.id)
      if (participant) {
        handleLeaveRoom(socket, participant.roomId)
        participantSockets.delete(socket.id)
      }
    })

    // Error handling
    socket.on('error', (error) => {
      console.error('[Socket.io] Socket error:', error)
    })
  })

  // Helper function to handle leaving room
  function handleLeaveRoom(socket, roomId) {
    if (!roomId) return

    const participant = participantSockets.get(socket.id)
    if (participant) {
      console.log(`[Socket.io] ${participant.participantType} leaving room:`, roomId)

      // Notify other participants
      socket.to(roomId).emit('participant-left', {
        participantType: participant.participantType,
        participantId: participant.participantId,
      })
    }

    socket.leave(roomId)

    // Clean up room data
    const room = activeRooms.get(roomId)
    if (room && participant) {
      room.participants.delete(participant.participantType)

      // Remove room if empty
      if (room.participants.size === 0) {
        activeRooms.delete(roomId)
        console.log(`[Socket.io] Room ${roomId} removed (empty)`)
      }
    }
  }

  // Start server
  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log(`> Socket.io server running`)
    })
})
