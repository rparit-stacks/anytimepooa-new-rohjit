'use client'

import { useEffect, useState } from 'react'

interface ChatMessage {
  id: string
  sender_type: 'user' | 'astrologer'
  sender_name: string
  message: string
  created_at: string
}

interface ChatHistoryProps {
  bookingId: string
}

export function ChatHistory({ bookingId }: ChatHistoryProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChatHistory()
  }, [bookingId])

  const fetchChatHistory = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/chat-history`)
      const data = await response.json()

      if (data.success) {
        setMessages(data.data)
      }
    } catch (error) {
      console.error('Error fetching chat history:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (loading) {
    return (
      <div className="chat-history loading p-4 text-center text-gray-500">
        Loading chat history...
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="chat-history empty p-4 text-center text-gray-500">
        No messages yet
      </div>
    )
  }

  return (
    <div className="chat-history space-y-3">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Chat History</h3>
      <div className="messages-container space-y-3 max-h-96 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message p-3 rounded-lg ${
              msg.sender_type === 'user'
                ? 'bg-orange-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <div className="message-header flex items-center justify-between mb-1">
              <strong className="text-sm font-semibold text-gray-900">
                {msg.sender_name}
              </strong>
              <span className="text-xs text-gray-500">{formatTimestamp(msg.created_at)}</span>
            </div>
            <div className="message-content text-sm text-gray-700">{msg.message}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

