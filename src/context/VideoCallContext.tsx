import React, { createContext, useContext, ReactNode } from 'react';
import { useVideoCall as useVideoCallHook, CallStatus } from '@/hooks/useVideoCall';
import { useAppSelector } from '@/store/hooks';
import { CallParticipant } from '@/store/api/videoCallApi';

interface VideoCallContextType {
  status: CallStatus;
  callType: 'video' | 'voice';
  activeCallId: string | null;
  remoteUser: { id: string; username: string; avatar_url?: string } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  participants: CallParticipant[];
  isGroupCall: boolean;
  availableDevices: MediaDeviceInfo[];
  selectedAudioInput: string;
  selectedAudioOutput: string;
  selectedVideoInput: string;
  initiateCall: (receiverId: string, receiverUsername: string, type?: 'video' | 'voice') => Promise<void>;
  initiateGroupCall: (groupId: string, groupName: string, type?: 'video' | 'voice') => Promise<void>;
  addParticipantToCall: (userId: string, username: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  switchCamera: (deviceId: string) => Promise<void>;
  switchMicrophone: (deviceId: string) => Promise<void>;
  flipCamera: () => Promise<void>;
  setSelectedAudioOutput: (deviceId: string) => void;
  remoteCanvasRef: React.RefObject<HTMLCanvasElement>;
}

const VideoCallContext = createContext<VideoCallContextType | undefined>(undefined);

export const VideoCallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAppSelector((state) => state.auth);
  const videoCall = useVideoCallHook(user?.id || '');

  return (
    <VideoCallContext.Provider value={videoCall}>
      {children}
    </VideoCallContext.Provider>
  );
};

export const useVideoCallContext = () => {
  const context = useContext(VideoCallContext);
  if (context === undefined) {
    throw new Error('useVideoCallContext must be used within a VideoCallProvider');
  }
  return context;
};
