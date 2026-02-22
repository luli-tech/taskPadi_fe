import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useVideoCall } from '@/hooks/useVideoCall';
import { useSocketManager } from '@/hooks/useSocketManager';
import { useGetAllUsersQuery } from '@/store/api/usersApi';
import { VideoCallOverlay } from './VideoCallOverlay';

export const VideoCallManager: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  useSocketManager(isAuthenticated);

  const { 
    status, 
    callType,
    remoteUser, 
    localStream, 
    remoteStream,
    participants,
    isGroupCall,
    acceptCall, 
    rejectCall, 
    endCall,
    addParticipantToCall,
  } = useVideoCall(user?.id || '');

  // Fetch all users so we can show the "add to call" list
  const { data: allUsersData } = useGetAllUsersQuery(undefined, { skip: !isAuthenticated });
  const rawUsers = Array.isArray(allUsersData) ? allUsersData : (allUsersData as any)?.data ?? [];
  const availableUsers = rawUsers
    .filter((u: any) => u.id !== user?.id)
    .map((u: any) => ({ id: u.id, username: u.username, avatar_url: u.avatar_url || undefined }));

  if (!isAuthenticated || !user) return null;

  return (
    <VideoCallOverlay
      status={status}
      callType={callType}
      remoteUser={remoteUser}
      localStream={localStream}
      remoteStream={remoteStream}
      participants={participants}
      isGroupCall={isGroupCall}
      onAccept={acceptCall}
      onReject={rejectCall}
      onEnd={endCall}
      onAddParticipant={addParticipantToCall}
      availableUsers={availableUsers}
    />
  );
};
