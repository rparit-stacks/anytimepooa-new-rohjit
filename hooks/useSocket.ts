"use client"

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  autoConnect?: boolean
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = false } = options
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [transport, setTransport] = useState('N/A')

  useEffect(() => {
    if (autoConnect && !socketRef.current) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect])

  const connect = () => {
    if (socketRef.current?.connected) {
      return socketRef.current
    }

    const socket = io({
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id)
      setIsConnected(true)
      setTransport(socket.io.engine.transport.name)

      socket.io.engine.on('upgrade', (transport) => {
        setTransport(transport.name)
      })
    })

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected')
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error)
      setIsConnected(false)
    })

    socketRef.current = socket
    return socket
  }

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }

  const emit = (event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    } else {
      console.warn('[Socket] Not connected, cannot emit:', event)
    }
  }

  const on = (event: string, callback: (...args: any[]) => void) => {
    socketRef.current?.on(event, callback)
  }

  const off = (event: string, callback?: (...args: any[]) => void) => {
    socketRef.current?.off(event, callback)
  }

  return {
    socket: socketRef.current,
    isConnected,
    transport,
    connect,
    disconnect,
    emit,
    on,
    off,
  }
}
