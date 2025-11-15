import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/client';

interface Message {
  id?: string;
  room_id: string;
  sender_id: string;
  sender_type: 'user' | 'astrologer';
  message: string;
  file_data?: string;
  file_type?: string;
  file_name?: string;
  file_size?: number;
  is_file: boolean;
  timestamp: string;
}

interface UseSupabaseRealtimeProps {
  roomId: string;
  participantType: 'user' | 'astrologer';
  participantId: string;
  onUserJoined?: () => void;
  onUserLeft?: () => void;
}

export function useSupabaseRealtime({
  roomId,
  participantType,
  participantId,
  onUserJoined,
  onUserLeft
}: UseSupabaseRealtimeProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherParticipantOnline, setOtherParticipantOnline] = useState(false);
  const [otherPersonTyping, setOtherPersonTyping] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't subscribe if we have temp/placeholder values
    if (!roomId || roomId === 'temp' || participantId === 'temp') {
      console.log('⏳ Waiting for real session data...');
      return;
    }

    console.log('🔌 Subscribing to Supabase Realtime channel:', roomId);

    // Create a channel for this room
    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: {
          key: participantId,
        },
      },
    });

    // Track presence (online/offline)
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const participants = Object.keys(state);
        
        // Check if other participant is online
        const otherOnline = participants.some(
          key => state[key]?.[0]?.participant_type !== participantType
        );
        
        setOtherParticipantOnline(otherOnline);
        
        if (otherOnline && onUserJoined) {
          onUserJoined();
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        console.log('User joined:', key, newPresences);
        const joiningUser = newPresences[0];
        if (joiningUser?.participant_type !== participantType) {
          setOtherParticipantOnline(true);
          if (onUserJoined) onUserJoined();
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        console.log('User left:', key, leftPresences);
        const leavingUser = leftPresences[0];
        if (leavingUser?.participant_type !== participantType) {
          setOtherParticipantOnline(false);
          if (onUserLeft) onUserLeft();
        }
      })
      // Listen for new messages
      .on('broadcast', { event: 'message' }, ({ payload }: any) => {
        console.log('New message:', payload);
        setMessages(prev => [...prev, payload as Message]);
      })
      // Listen for typing indicators
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        if (payload.participant_type !== participantType) {
          setOtherPersonTyping(true);
          
          // Clear previous timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          // Auto-stop typing after 3 seconds
          typingTimeoutRef.current = setTimeout(() => {
            setOtherPersonTyping(false);
          }, 3000);
        }
      })
      .on('broadcast', { event: 'stop-typing' }, ({ payload }: any) => {
        if (payload.participant_type !== participantType) {
          setOtherPersonTyping(false);
        }
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await channel.track({
            participant_id: participantId,
            participant_type: participantType,
            online_at: new Date().toISOString(),
          });
          
          console.log('✅ Subscribed to room:', roomId);
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [roomId, participantId, participantType, onUserJoined, onUserLeft]);

  // Send message
  const sendMessage = async (message: Omit<Message, 'id' | 'timestamp'>) => {
    if (!channelRef.current) return;

    const fullMessage: Message = {
      ...message,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all participants
    await channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: fullMessage,
    });
  };

  // Send typing indicator
  const sendTyping = async () => {
    if (!channelRef.current) return;

    await channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        participant_type: participantType,
      },
    });
  };

  // Stop typing indicator
  const stopTyping = async () => {
    if (!channelRef.current) return;

    await channelRef.current.send({
      type: 'broadcast',
      event: 'stop-typing',
      payload: {
        participant_type: participantType,
      },
    });
  };

  return {
    messages,
    otherParticipantOnline,
    otherPersonTyping,
    sendMessage,
    sendTyping,
    stopTyping,
  };
}

