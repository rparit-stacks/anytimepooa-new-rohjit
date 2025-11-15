"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { WEBRTC_CONFIG, MEDIA_CONSTRAINTS, SessionType } from '@/lib/webrtc-config'

interface UseWebRTCOptions {
  sessionType: SessionType
  roomId: string
  socket: any // Socket.io instance
  onRemoteStream?: (stream: MediaStream) => void
  onDataChannelMessage?: (message: string) => void
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
}

export function useWebRTC({
  sessionType,
  roomId,
  socket,
  onRemoteStream,
  onDataChannelMessage,
  onConnectionStateChange,
}: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new')
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: sessionType !== 'chat' ? MEDIA_CONSTRAINTS.audio : false,
        video: sessionType === 'video' ? MEDIA_CONSTRAINTS.video : false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      setLocalStream(stream)
      console.log('[WebRTC] Local stream initialized:', stream.id)
      return stream
    } catch (error) {
      console.error('[WebRTC] Failed to get local media:', error)
      throw error
    }
  }, [sessionType])

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current
    }

    const pc = new RTCPeerConnection(WEBRTC_CONFIG)
    peerConnectionRef.current = pc

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState)
      setConnectionState(pc.connectionState)
      onConnectionStateChange?.(pc.connectionState)
    }

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('[WebRTC] Sending ICE candidate')
        socket.emit('webrtc-ice-candidate', {
          roomId,
          candidate: event.candidate,
        })
      }
    }

    // Remote stream
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind)
      const [stream] = event.streams
      remoteStreamRef.current = stream
      setRemoteStream(stream)
      onRemoteStream?.(stream)
    }

    // Data channel for chat
    if (sessionType === 'chat' || sessionType === 'video' || sessionType === 'voice') {
      const dataChannel = pc.createDataChannel('chat', {
        ordered: true,
      })

      dataChannel.onopen = () => {
        console.log('[WebRTC] Data channel opened')
      }

      dataChannel.onclose = () => {
        console.log('[WebRTC] Data channel closed')
      }

      dataChannel.onmessage = (event) => {
        console.log('[WebRTC] Data channel message:', event.data)
        onDataChannelMessage?.(event.data)
      }

      dataChannelRef.current = dataChannel
    }

    // Handle incoming data channel
    pc.ondatachannel = (event) => {
      const dataChannel = event.channel
      dataChannelRef.current = dataChannel

      dataChannel.onopen = () => {
        console.log('[WebRTC] Incoming data channel opened')
      }

      dataChannel.onmessage = (event) => {
        console.log('[WebRTC] Data channel message:', event.data)
        onDataChannelMessage?.(event.data)
      }
    }

    return pc
  }, [roomId, socket, sessionType, onRemoteStream, onDataChannelMessage, onConnectionStateChange])

  // Create and send offer
  const createOffer = useCallback(async () => {
    try {
      const pc = createPeerConnection()

      // Add local tracks to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!)
        })
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      console.log('[WebRTC] Sending offer')
      socket?.emit('webrtc-offer', {
        roomId,
        offer,
      })
    } catch (error) {
      console.error('[WebRTC] Failed to create offer:', error)
      throw error
    }
  }, [roomId, socket, createPeerConnection])

  // Handle incoming offer
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    try {
      const pc = createPeerConnection()

      // Add local tracks to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!)
        })
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      console.log('[WebRTC] Sending answer')
      socket?.emit('webrtc-answer', {
        roomId,
        answer,
      })
    } catch (error) {
      console.error('[WebRTC] Failed to handle offer:', error)
      throw error
    }
  }, [roomId, socket, createPeerConnection])

  // Handle incoming answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    try {
      const pc = peerConnectionRef.current
      if (!pc) {
        throw new Error('Peer connection not initialized')
      }

      await pc.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('[WebRTC] Answer set successfully')
    } catch (error) {
      console.error('[WebRTC] Failed to handle answer:', error)
      throw error
    }
  }, [])

  // Handle incoming ICE candidate
  const handleICECandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      const pc = peerConnectionRef.current
      if (!pc) {
        throw new Error('Peer connection not initialized')
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate))
      console.log('[WebRTC] ICE candidate added')
    } catch (error) {
      console.error('[WebRTC] Failed to add ICE candidate:', error)
    }
  }, [])

  // Send message via data channel
  const sendMessage = useCallback((message: string) => {
    if (dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(message)
      return true
    } else {
      console.warn('[WebRTC] Data channel not open')
      return false
    }
  }, [])

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsAudioEnabled(!isAudioEnabled)
      socket?.emit('media-state-change', {
        roomId,
        mediaType: 'audio',
        enabled: !isAudioEnabled,
      })
    }
  }, [isAudioEnabled, roomId, socket])

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks()
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsVideoEnabled(!isVideoEnabled)
      socket?.emit('media-state-change', {
        roomId,
        mediaType: 'video',
        enabled: !isVideoEnabled,
      })
    }
  }, [isVideoEnabled, roomId, socket])

  // Cleanup
  const cleanup = useCallback(() => {
    console.log('[WebRTC] Cleaning up')

    // Close data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
      setLocalStream(null)
    }

    // Clear remote stream
    remoteStreamRef.current = null
    setRemoteStream(null)
  }, [])

  return {
    localStream,
    remoteStream,
    connectionState,
    isAudioEnabled,
    isVideoEnabled,
    initializeMedia,
    createOffer,
    handleOffer,
    handleAnswer,
    handleICECandidate,
    sendMessage,
    toggleAudio,
    toggleVideo,
    cleanup,
  }
}
