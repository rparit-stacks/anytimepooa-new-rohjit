import { useState, useRef, useEffect } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack
} from 'agora-rtc-sdk-ng';

interface UseAgoraProps {
  channelName: string;
  sessionType: 'voice' | 'video';
  onUserJoined?: (user: IAgoraRTCRemoteUser) => void;
  onUserLeft?: (user: IAgoraRTCRemoteUser) => void;
}

export function useAgora({ channelName, sessionType, onUserJoined, onUserLeft }: UseAgoraProps) {
  const [client] = useState<IAgoraRTCClient>(() => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }));
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [joined, setJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [remoteUserSpeaking, setRemoteUserSpeaking] = useState<{[key: string]: boolean}>({});

  // Join channel
  const join = async () => {
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera/microphone access. Please use Chrome, Firefox, Safari, or Edge.');
      }

      // Check if already joined
      if (joined) {
        console.log('⚠️ Already joined Agora channel, skipping...');
        return true;
      }

      // Check if client is already connecting/connected
      if (client.connectionState === 'CONNECTING' || client.connectionState === 'CONNECTED') {
        console.log('⚠️ Client already connecting/connected, leaving first...');
        await client.leave();
      }

      console.log('🎤 Requesting Agora token...');
      
      // Get token from API
      const response = await fetch('/api/agora/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName,
          uid: 0, // 0 means Agora will assign a random UID
          role: 'publisher'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get Agora token');
      }

      const { token, appId, uid } = await response.json();
      console.log('✅ Agora token received');

      // Join channel
      console.log('🔌 Joining Agora channel:', channelName);
      await client.join(appId, channelName, token, uid);
      console.log('✅ Joined Agora channel');

      // Create local tracks
      console.log('🎥 Creating local tracks...');
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'high_quality_stereo',
        AEC: true, // Acoustic Echo Cancellation
        AGC: true, // Auto Gain Control
        ANS: true  // Automatic Noise Suppression
      });
      setLocalAudioTrack(audioTrack);

      let videoTrack: ICameraVideoTrack | null = null;
      if (sessionType === 'video') {
        videoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: '720p_2', // 1280x720 @ 30fps
          optimizationMode: 'detail'
        });
        setLocalVideoTrack(videoTrack);
      }

      console.log('✅ Local tracks created');

      // Publish tracks
      const tracksToPublish = sessionType === 'video' && videoTrack 
        ? [audioTrack, videoTrack]
        : [audioTrack];
      
      await client.publish(tracksToPublish);
      console.log('✅ Published tracks to channel');

      // Enable audio volume indicator
      client.enableAudioVolumeIndicator();

      setJoined(true);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to join Agora channel:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Handle specific errors
      if (error.code === 'PERMISSION_DENIED' || error.code === 'NotAllowedError') {
        throw new Error('Camera/Microphone permission denied. Please click "Allow" when your browser asks for permission.');
      } else if (error.code === 'DEVICE_NOT_FOUND' || error.code === 'NotFoundError') {
        throw new Error('No camera or microphone found. Please connect a device and try again.');
      } else if (error.code === 'NOT_SUPPORTED' || error.message?.includes('getUserMedia')) {
        throw new Error('Your browser does not support video/audio calls. Please use Chrome, Firefox, Safari, or Edge on a secure connection (HTTPS).');
      } else if (error.code === 'INVALID_OPERATION') {
        throw new Error('Connection error. Please refresh the page and try again.');
      } else {
        throw new Error(error.message || 'Failed to join call. Please check your internet connection and try again.');
      }
    }
  };

  // Leave channel
  const leave = async () => {
    try {
      // Stop and close local tracks
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
        setLocalAudioTrack(null);
      }
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
        setLocalVideoTrack(null);
      }

      // Leave channel
      await client.leave();
      setJoined(false);
      setRemoteUsers([]);
      console.log('✅ Left Agora channel');
    } catch (error) {
      console.error('❌ Failed to leave channel:', error);
    }
  };

  // Toggle mute
  const toggleMute = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  // Setup event listeners
  useEffect(() => {
    // User published (joined with media)
    client.on('user-published', async (user, mediaType) => {
      console.log('👤 User published:', user.uid, mediaType);
      await client.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        setRemoteUsers(prev => {
          const exists = prev.find(u => u.uid === user.uid);
          if (exists) return prev;
          return [...prev, user];
        });
      }
      
      if (mediaType === 'audio') {
        const audioTrack = user.audioTrack as IRemoteAudioTrack;
        audioTrack.play();
      }

      if (onUserJoined) {
        onUserJoined(user);
      }
    });

    // User unpublished
    client.on('user-unpublished', (user, mediaType) => {
      console.log('👤 User unpublished:', user.uid, mediaType);
      if (mediaType === 'video') {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      }
    });

    // User left
    client.on('user-left', (user) => {
      console.log('👤 User left:', user.uid);
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      setRemoteUserSpeaking(prev => {
        const newState = { ...prev };
        delete newState[user.uid];
        return newState;
      });
      
      if (onUserLeft) {
        onUserLeft(user);
      }
    });

    // Volume indicator for speaking detection
    client.on('volume-indicator', (volumes) => {
      volumes.forEach((volume) => {
        if (volume.uid === client.uid) {
          // Local user speaking
          setIsSpeaking(volume.level > 30);
        } else {
          // Remote user speaking
          setRemoteUserSpeaking(prev => ({
            ...prev,
            [volume.uid]: volume.level > 30
          }));
        }
      });
    });

    return () => {
      client.removeAllListeners();
    };
  }, [client, onUserJoined, onUserLeft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      if (joined) {
        leave().catch(err => console.error('Cleanup error:', err));
      }
    };
  }, [joined]);

  return {
    client,
    localAudioTrack,
    localVideoTrack,
    remoteUsers,
    joined,
    isMuted,
    isVideoOff,
    isSpeaking,
    remoteUserSpeaking,
    join,
    leave,
    toggleMute,
    toggleVideo
  };
}

