'use client';

import { useEffect, useRef } from 'react';
import { IAgoraRTCRemoteUser, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { Mic, MicOff, Video, VideoOff, PhoneOff, User } from 'lucide-react';

interface AgoraVideoCallProps {
  localVideoTrack: ICameraVideoTrack | null;
  localAudioTrack: IMicrophoneAudioTrack | null;
  remoteUsers: IAgoraRTCRemoteUser[];
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
  remoteUserSpeaking: {[key: string]: boolean};
  sessionType: 'voice' | 'video';
  otherParticipantName: string;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

export default function AgoraVideoCall({
  localVideoTrack,
  localAudioTrack,
  remoteUsers,
  isMuted,
  isVideoOff,
  isSpeaking,
  remoteUserSpeaking,
  sessionType,
  otherParticipantName,
  onToggleMute,
  onToggleVideo,
  onEndCall
}: AgoraVideoCallProps) {
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  // Play local video
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current && sessionType === 'video') {
      localVideoTrack.play(localVideoRef.current);
    }
    
    return () => {
      if (localVideoTrack) {
        localVideoTrack.stop();
      }
    };
  }, [localVideoTrack, sessionType]);

  // Play remote videos
  useEffect(() => {
    remoteUsers.forEach(user => {
      if (user.videoTrack && remoteVideoRefs.current[user.uid]) {
        user.videoTrack.play(remoteVideoRefs.current[user.uid]!);
      }
    });
  }, [remoteUsers]);

  const remoteUser = remoteUsers[0];
  const isRemoteSpeaking = remoteUser ? remoteUserSpeaking[remoteUser.uid] : false;

  return (
    <div className="absolute inset-0 bg-gray-900">
      {/* Remote Video/Audio - Full Screen */}
      {sessionType === 'video' ? (
        <div className="w-full h-full relative">
          {remoteUser ? (
            <div 
              ref={(el) => {
                if (remoteUser) remoteVideoRefs.current[remoteUser.uid] = el;
              }}
              className="w-full h-full"
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center">
                <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <User className="w-12 h-12 text-white" />
                </div>
                <p className="text-white text-xl font-semibold mb-2">{otherParticipantName}</p>
                <p className="text-gray-300">Waiting to join...</p>
              </div>
            </div>
          )}
          
          {/* Sound Wave Indicator for Remote */}
          {isRemoteSpeaking && (
            <div className="absolute top-4 left-4 flex items-center space-x-1 bg-black bg-opacity-50 px-3 py-2 rounded-full">
              <div className="flex space-x-1">
                <div className="w-1 h-4 bg-green-400 rounded-full animate-soundWave" style={{ animationDelay: '0s' }}></div>
                <div className="w-1 h-6 bg-green-400 rounded-full animate-soundWave" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-5 bg-green-400 rounded-full animate-soundWave" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-7 bg-green-400 rounded-full animate-soundWave" style={{ animationDelay: '0.3s' }}></div>
                <div className="w-1 h-4 bg-green-400 rounded-full animate-soundWave" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="text-white text-xs ml-2">Speaking...</span>
            </div>
          )}
        </div>
      ) : (
        // Voice Call - Avatar
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className={`w-32 h-32 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 transition-all ${
              isRemoteSpeaking ? 'ring-8 ring-green-400 ring-opacity-50 scale-110' : ''
            }`}>
              <User className="w-16 h-16 text-white" />
            </div>
            <p className="text-white text-2xl font-semibold mb-2">{otherParticipantName}</p>
            {remoteUser ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-green-400">Connected</p>
              </div>
            ) : (
              <p className="text-gray-400">Waiting to join...</p>
            )}
          </div>
        </div>
      )}

      {/* Floating Local Video - Bottom Right Corner */}
      {sessionType === 'video' && (
        <div className="absolute bottom-20 right-4 w-28 h-40 sm:w-32 sm:h-44 bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-white z-10">
          <div 
            ref={localVideoRef}
            className="w-full h-full"
            style={{ width: '100%', height: '100%', transform: 'scaleX(-1)' }}
          />
          
          {/* Sound Wave Indicator for Local */}
          {isSpeaking && (
            <div className="absolute top-2 left-2 flex space-x-0.5 bg-black bg-opacity-50 px-2 py-1 rounded-full">
              <div className="w-0.5 h-3 bg-green-400 rounded-full animate-soundWave" style={{ animationDelay: '0s' }}></div>
              <div className="w-0.5 h-4 bg-green-400 rounded-full animate-soundWave" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-0.5 h-3 bg-green-400 rounded-full animate-soundWave" style={{ animationDelay: '0.2s' }}></div>
            </div>
          )}
          
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-0.5 rounded-full">
            <span className="text-white text-xs">You</span>
          </div>
        </div>
      )}

      {/* Control Buttons - Bottom Center */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 z-20">
        {/* Mute Button */}
        <button
          onClick={onToggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white bg-opacity-20 hover:bg-opacity-30'
          }`}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>

        {/* End Call Button */}
        <button
          onClick={onEndCall}
          className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all shadow-lg"
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </button>

        {/* Video Toggle (only for video calls) */}
        {sessionType === 'video' && (
          <button
            onClick={onToggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white bg-opacity-20 hover:bg-opacity-30'
            }`}
          >
            {isVideoOff ? (
              <VideoOff className="w-6 h-6 text-white" />
            ) : (
              <Video className="w-6 h-6 text-white" />
            )}
          </button>
        )}
      </div>

      <style jsx>{`
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



