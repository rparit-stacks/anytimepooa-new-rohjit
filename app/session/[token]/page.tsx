'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  MessageSquare,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';
import { useAgora } from '@/hooks/useAgora';
import AgoraVideoCall from '@/components/AgoraVideoCall';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

interface SessionData {
  sessionId: string;
  roomId: string;
  sessionType: 'chat' | 'voice' | 'video';
  participantType: 'user' | 'astrologer';
  participantId: string;
  otherParticipantName: string;
  paidDurationMinutes: number;
  status: string;
  scheduledStartTime: string;
}

export default function SessionRoom() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  
  // Media states
  const [otherParticipantJoined, setOtherParticipantJoined] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('checking');
  const [permissionError, setPermissionError] = useState('');
  
  // Agora hook - ALWAYS call (React Hooks rule), but only use for voice/video
  const agora = useAgora({
    channelName: sessionData?.roomId || 'temp',
    sessionType: sessionData?.sessionType === 'video' ? 'video' : 'voice',
    onUserJoined: () => {
      console.log('✅ Remote user joined');
      setOtherParticipantJoined(true);
    },
    onUserLeft: () => {
      console.log('❌ Remote user left');
      setOtherParticipantJoined(false);
    }
  });
  
  // Timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [timerPaused, setTimerPaused] = useState(true);
  
  // Chat
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Typing timeout
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Supabase Realtime for chat (replaces Socket.IO)
  // ALWAYS call hook (React Hooks rule), but only use when sessionData is ready
  const realtime = useSupabaseRealtime({
    roomId: sessionData?.roomId || 'temp',
    participantType: sessionData?.participantType || 'user',
    participantId: sessionData?.participantId || 'temp',
    onUserJoined: () => {
      console.log('✅ Other participant joined (Supabase)');
      setOtherParticipantJoined(true);
    },
    onUserLeft: () => {
      console.log('❌ Other participant left (Supabase)');
      setOtherParticipantJoined(false);
    }
  });

  // Validate session on mount
  useEffect(() => {
    validateSession();
  }, [token]);

  // Timer effect - only counts when BOTH are connected
  useEffect(() => {
    // Timer runs only when both joined and not paused
    if (!joined || !otherParticipantJoined || timerPaused) return;
    
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      setRemainingTime(prev => {
        const newRemaining = Math.max(0, prev - 1);
        
        // Auto end session when time runs out
        if (newRemaining === 0) {
          endSession();
        }
        
        return newRemaining;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [joined, otherParticipantJoined, timerPaused]);

  // Update timer pause state based on connection
  useEffect(() => {
    if (joined && otherParticipantJoined) {
      setTimerPaused(false); // Both connected - start timer
    } else if (joined) {
      setTimerPaused(true); // Only one connected - pause timer
    }
  }, [joined, otherParticipantJoined]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && realtime) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [realtime?.messages]);

  const validateSession = async () => {
    try {
      const response = await fetch('/api/sessions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (!data.valid) {
        setError(data.message || 'Invalid session');
        setLoading(false);
        return;
      }

      setSessionData(data);
      setRemainingTime(data.paidDurationMinutes * 60);
      setLoading(false);
    } catch (err) {
      setError('Failed to validate session');
      setLoading(false);
    }
  };

  const joinSession = async () => {
    if (!sessionData) return;

    try {
      // FIRST: Join Agora for voice/video calls
      if (sessionData.sessionType === 'voice' || sessionData.sessionType === 'video') {
        console.log('🎤 Step 1: Joining Agora channel...');
        try {
          await agora.join();
          setPermissionStatus('granted');
          console.log('✅ Step 1 Complete: Joined Agora channel');
        } catch (err: any) {
          console.error('❌ Failed to join Agora:', err);
          setPermissionStatus('denied');
          setPermissionError(err.message);
          setError(err.message);
          return; // Don't proceed if Agora join failed
        }
      }

      // SECOND: Mark as joined in database (Supabase Realtime handles presence automatically)
      console.log('💾 Step 2: Marking as joined in database...');
      await fetch('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: sessionData.sessionId,
          participantType: sessionData.participantType 
        })
      });

      console.log('✅ Step 2 Complete: Marked as joined');
      setJoined(true);
      console.log('🎉 Session joined successfully! (Using Supabase Realtime)');
    } catch (err) {
      console.error('❌ Failed to join session:', err);
      setError('Failed to join session');
    }
  };

  const retryPermissions = async () => {
    setPermissionError('');
    setError(null);
    try {
      await agora.join();
      setPermissionStatus('granted');
    } catch (err: any) {
      setPermissionStatus('denied');
      setPermissionError(err.message);
      setError(err.message);
    }
  };

  const handleTyping = async (value: string) => {
    setNewMessage(value);
    
    if (!realtime || !sessionData) return;
    
    // Emit typing event
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      await realtime.sendTyping();
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      if (realtime) {
        await realtime.stopTyping();
      }
    }, 1000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !realtime || !sessionData) return;

    setUploadingFile(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        // Send file message via Supabase Realtime
        await realtime.sendMessage({
          room_id: sessionData.roomId,
          sender_id: sessionData.participantId,
          sender_type: sessionData.participantType,
          message: file.name,
          file_data: base64,
          file_type: file.type,
          file_name: file.name,
          file_size: file.size,
          is_file: true,
        });
        
        setUploadingFile(false);
      };

      reader.onerror = () => {
        console.error('File read error');
        setUploadingFile(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File upload error:', err);
      setUploadingFile(false);
    }

    // Reset input
    e.target.value = '';
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !realtime || !sessionData) return;

    // Stop typing indicator
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    await realtime.stopTyping();

    // Send message via Supabase Realtime
    await realtime.sendMessage({
      room_id: sessionData.roomId,
      sender_id: sessionData.participantId,
      sender_type: sessionData.participantType,
      message: newMessage,
      is_file: false,
    });

    setNewMessage('');
  };

  const endSession = async () => {
    try {
      // Leave Agora channel (only for voice/video)
      if (sessionData && (sessionData.sessionType === 'voice' || sessionData.sessionType === 'video')) {
        await agora.leave();
      }

      // Supabase Realtime will auto-cleanup on unmount (no manual disconnect needed)

      // End session in database
      await fetch('/api/sessions/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: sessionData?.sessionId,
          reason: 'completed'
        })
      });

      // Redirect based on participant type - use window.location for astrologer to bypass middleware
      if (sessionData?.participantType === 'astrologer') {
        window.location.href = '/astrologer-portal/dashboard';
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Failed to end session:', err);
      // Fallback redirect
      if (sessionData?.participantType === 'astrologer') {
        window.location.href = '/astrologer-portal/dashboard';
      } else {
        router.push('/dashboard');
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {sessionData.sessionType === 'chat' && <MessageSquare className="w-10 h-10 text-orange-500" />}
              {sessionData.sessionType === 'voice' && <Phone className="w-10 h-10 text-orange-500" />}
              {sessionData.sessionType === 'video' && <Video className="w-10 h-10 text-orange-500" />}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {sessionData.sessionType.charAt(0).toUpperCase() + sessionData.sessionType.slice(1)} Session
            </h2>
            <p className="text-gray-600">with {sessionData.otherParticipantName}</p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Duration</span>
              <span className="font-semibold text-gray-900">{sessionData.paidDurationMinutes} minutes</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Session Type</span>
              <span className="font-semibold text-gray-900 capitalize">{sessionData.sessionType}</span>
          </div>
          
            {/* Permission Notice */}
            {(sessionData.sessionType === 'voice' || sessionData.sessionType === 'video') && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-900 mb-1">
                      Permission Required
                    </p>
                    <p className="text-xs text-orange-700">
                      {sessionData.sessionType === 'video' 
                        ? 'This session requires camera and microphone access. Please allow when prompted.'
                        : 'This session requires microphone access. Please allow when prompted.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={joinSession}
            className="w-full py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            Join Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Permission Error Modal */}
      {permissionStatus === 'denied' && permissionError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Permission Denied
              </h3>
              
              <p className="text-gray-600 mb-6">
                {permissionError}
              </p>
              
              <div className="space-y-3 w-full">
                <button
                  onClick={retryPermissions}
                  className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                >
                  Try Again
                </button>
                
                <div className="p-4 bg-gray-50 rounded-lg text-left">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    How to enable permissions:
                  </p>
                  <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                    <li>Click the lock icon 🔒 in your browser's address bar</li>
                    <li>Find {sessionData?.sessionType === 'video' ? 'Camera and Microphone' : 'Microphone'} settings</li>
                    <li>Change to "Allow"</li>
                    <li>Refresh the page or click "Try Again"</li>
                  </ol>
            </div>
              </div>
            </div>
          </div>
            </div>
          )}

      {/* Header - Full Width */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
            <div className="flex items-center space-x-2 min-w-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
              <span className="font-semibold text-gray-900 text-sm sm:text-base truncate">{sessionData.otherParticipantName}</span>
            </div>
            {otherParticipantJoined && (
              <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium flex-shrink-0">
                Connected
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              <span className="font-mono text-sm sm:text-lg font-semibold text-gray-900">
                {formatTime(elapsedTime)}
              </span>
              <span className="text-gray-500 text-xs sm:text-base">/</span>
              <span className="font-mono text-sm sm:text-lg text-orange-500">
                {formatTime(remainingTime)}
              </span>
            </div>
            </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Video/Voice Session - Agora Powered */}
        {(sessionData.sessionType === 'video' || sessionData.sessionType === 'voice') && (
          <AgoraVideoCall
            localVideoTrack={agora.localVideoTrack}
            localAudioTrack={agora.localAudioTrack}
            remoteUsers={agora.remoteUsers}
            isMuted={agora.isMuted}
            isVideoOff={agora.isVideoOff}
            isSpeaking={agora.isSpeaking}
            remoteUserSpeaking={agora.remoteUserSpeaking}
            sessionType={sessionData.sessionType}
            otherParticipantName={sessionData.otherParticipantName}
            onToggleMute={agora.toggleMute}
            onToggleVideo={agora.toggleVideo}
            onEndCall={endSession}
          />
        )}

        {/* Chat Interface - WhatsApp Style - Full Edge to Edge */}
        {sessionData.sessionType === 'chat' && (
          <div className="flex-1 flex flex-col bg-white">
            {/* Chat Header */}
            <div className="p-3 sm:p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" />
                  </div>
                  {otherParticipantJoined && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                )}
              </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{sessionData.otherParticipantName}</h3>
                  <p className="text-xs sm:text-sm text-orange-100">
                    {otherParticipantJoined ? (
                      realtime?.otherPersonTyping ? (
                        <span className="flex items-center">
                          <span className="typing-dots mr-1">
                            <span></span><span></span><span></span>
                          </span>
                          typing...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
                          Online
                </span>
                      )
                    ) : (
                      'Waiting...'
                    )}
                  </p>
        </div>
              </div>
            </div>

            {/* Messages - WhatsApp Style Background */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#f0f2f5]" style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23e5e7eb\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
            }}>
              {!otherParticipantJoined && (
                <div className="text-center py-8">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 inline-block">
                    <p className="text-yellow-800 text-sm">
                      ⏳ Waiting for {sessionData.otherParticipantName} to join...
                    </p>
                  </div>
                </div>
              )}
              
              {(!realtime?.messages || realtime.messages.length === 0) && otherParticipantJoined ? (
                <div className="text-center text-gray-500 mt-8">
                  <div className="bg-white rounded-lg p-6 inline-block shadow-sm">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-orange-400" />
                    <p className="text-sm">Start your conversation!</p>
                  </div>
                </div>
              ) : (
                realtime?.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender_type === sessionData.participantType ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                  >
                    <div
                      className={`max-w-[75%] sm:max-w-md px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg shadow-sm ${
                        msg.sender_type === sessionData.participantType
                          ? 'bg-orange-500 text-white rounded-br-none'
                          : 'bg-white text-gray-900 rounded-bl-none'
                      }`}
                    >
                      {msg.is_file ? (
                        <div className="space-y-2">
                          {msg.file_type?.startsWith('image/') ? (
                            <div className="rounded-lg overflow-hidden">
                              <img 
                                src={msg.file_data} 
                                alt={msg.file_name}
                                className="max-w-full h-auto max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(msg.file_data, '_blank')}
                              />
                            </div>
                          ) : (
                            <a 
                              href={msg.file_data} 
                              download={msg.file_name}
                              className={`flex items-center space-x-2 p-2 rounded-lg hover:opacity-80 transition-opacity ${
                                msg.sender_type === sessionData.participantType
                                  ? 'bg-orange-600'
                                  : 'bg-gray-100'
                              }`}
                            >
                              <svg className="w-8 h-8 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                              </svg>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{msg.file_name}</p>
                                <p className="text-xs opacity-75">{msg.file_size ? (msg.file_size / 1024).toFixed(1) : '0'} KB</p>
                              </div>
                              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm sm:text-base break-words">{msg.message}</p>
                      )}
                      <div className={`flex items-center justify-end space-x-1 mt-1`}>
                        <p className={`text-[10px] sm:text-xs ${
                          msg.sender_type === sessionData.participantType ? 'text-orange-100' : 'text-gray-500'
                        }`}>
                          {new Date(msg.timestamp).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </p>
                        {msg.sender_type === sessionData.participantType && (
                          <svg className="w-4 h-4 text-orange-100" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input - WhatsApp Style with Attachment */}
            <div className="p-3 sm:p-4 bg-white border-t border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-2">
                {/* Attachment Button */}
                <label className={`cursor-pointer p-2 hover:bg-gray-100 rounded-full transition-colors ${uploadingFile ? 'opacity-50' : ''}`}>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf,.doc,.docx"
                    disabled={!otherParticipantJoined || uploadingFile}
                    onChange={handleFileUpload}
                  />
                  {uploadingFile ? (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  )}
                </label>

                {/* Message Input */}
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  disabled={!otherParticipantJoined}
                  className="flex-1 px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                />

                {/* Send Button */}
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || !otherParticipantJoined}
                  className="p-2.5 sm:p-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 flex-shrink-0"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        /* Typing indicator dots */
        .typing-dots {
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        
        .typing-dots span {
          width: 4px;
          height: 4px;
          background-color: #fff;
          border-radius: 50%;
          animation: typingDot 1.4s infinite;
        }
        
        .typing-dots span:nth-child(1) {
          animation-delay: 0s;
        }
        
        .typing-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes typingDot {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          30% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        
        /* Sound wave animation */
        @keyframes soundWave {
          0%, 100% {
            transform: scaleY(0.5);
            opacity: 0.7;
          }
          50% {
            transform: scaleY(1.5);
            opacity: 1;
          }
        }
        
        .animate-soundWave {
          animation: soundWave 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
