import { useState, useEffect, useCallback, useRef } from 'react';
import { wsService, WsMessageType } from '@/lib/websocket';
import { 
  useInitiateCallMutation, 
  useAcceptCallMutation, 
  useRejectCallMutation, 
  useEndCallMutation,
  useAddParticipantMutation,
  type CallParticipant,
} from '@/store/api/videoCallApi';
import { useToast } from '@/hooks/use-toast';

export enum CallStatus {
  IDLE = 'idle',
  OUTGOING = 'outgoing',
  INCOMING = 'incoming',
  ACTIVE = 'active',
  ENDED = 'ended',
}

interface User {
  id: string;
  username: string;
  avatar_url?: string;
}

export const useVideoCall = (currentUserId: string) => {
  const [status, setStatus] = useState<CallStatus>(CallStatus.IDLE);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callType, setCallType] = useState<'video' | 'voice'>('video');
  const [remoteUser, setRemoteUser] = useState<User | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [isGroupCall, setIsGroupCall] = useState(false);
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const { toast } = useToast();

  const [initiateCallApi] = useInitiateCallMutation();
  const [acceptCallApi] = useAcceptCallMutation();
  const [rejectCallApi] = useRejectCallMutation();
  const [endCallApi] = useEndCallMutation();
  const [addParticipantApi] = useAddParticipantMutation();

  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const cleanup = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setStatus(CallStatus.IDLE);
    setActiveCallId(null);
    setRemoteUser(null);
    setParticipants([]);
    setIsGroupCall(false);
  }, [localStream, remoteStream]);

  const setupPeerConnection = useCallback((callId: string, toUserId: string) => {
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsService.sendIceCandidate(callId, toUserId, JSON.stringify(event.candidate));
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    peerConnection.current = pc;
    return pc;
  }, [localStream]);

  // Handle incoming signaling messages
  useEffect(() => {
    const unsubInitiated = wsService.subscribe(WsMessageType.CallInitiated, (data) => {
      if (data.receiver_id === currentUserId) {
        setActiveCallId(data.call_id);
        setCallType(data.call_type as 'video' | 'voice');
        setRemoteUser({ id: data.caller_id, username: data.caller_username || 'User' });
        setStatus(CallStatus.INCOMING);
      }
    });

    const unsubAccepted = wsService.subscribe(WsMessageType.CallAccepted, async (data) => {
      if (status === CallStatus.OUTGOING && data.call_id === activeCallId) {
        setStatus(CallStatus.ACTIVE);
        
        // Create offer
        const pc = setupPeerConnection(data.call_id, data.receiver_id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        wsService.sendCallOffer(data.call_id, data.receiver_id, offer.sdp!);
      }
    });

    const unsubOffer = wsService.subscribe(WsMessageType.CallOffer, async (data) => {
      if (status === CallStatus.ACTIVE && data.call_id === activeCallId) {
        const pc = setupPeerConnection(data.call_id, data.from_user_id);
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        wsService.sendCallAnswer(data.call_id, data.from_user_id, answer.sdp!);
      }
    });

    const unsubAnswer = wsService.subscribe(WsMessageType.CallAnswer, async (data) => {
      if (peerConnection.current && data.call_id === activeCallId) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
      }
    });

    const unsubIce = wsService.subscribe(WsMessageType.IceCandidate, async (data) => {
      if (peerConnection.current && data.call_id === activeCallId) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(JSON.parse(data.candidate)));
        } catch (e) {
          console.error("Error adding received ice candidate", e);
        }
      }
    });

    const unsubRejected = wsService.subscribe(WsMessageType.CallRejected, (data) => {
      if (data.call_id === activeCallId) {
        toast({ title: "Call Rejected", variant: "destructive" });
        cleanup();
      }
    });

    const unsubEnded = wsService.subscribe(WsMessageType.CallEnded, (data) => {
      if (data.call_id === activeCallId) {
        toast({ title: "Call Ended" });
        cleanup();
      }
    });

    return () => {
      unsubInitiated();
      unsubAccepted();
      unsubOffer();
      unsubAnswer();
      unsubIce();
      unsubRejected();
      unsubEnded();
    };
  }, [currentUserId, status, activeCallId, setupPeerConnection, cleanup, toast]);

  const initiateCall = async (receiverId: string, receiverUsername: string, type: 'video' | 'voice' = 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: type === 'video', 
        audio: true 
      });
      setLocalStream(stream);
      setCallType(type);
      setIsGroupCall(false);

      const call = await initiateCallApi({ 
        receiver_id: receiverId,
        call_type: type
      }).unwrap();
      setActiveCallId(call.id);
      setRemoteUser({ id: receiverId, username: receiverUsername });
      setParticipants(call.participants || []);
      setStatus(CallStatus.OUTGOING);
    } catch (error) {
      console.error("Failed to initiate call:", error);
      toast({ title: `Failed to access ${type === 'video' ? 'camera/' : ''}microphone`, variant: "destructive" });
    }
  };

  const initiateGroupCall = async (groupId: string, groupName: string, type: 'video' | 'voice' = 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: type === 'video', 
        audio: true 
      });
      setLocalStream(stream);
      setCallType(type);
      setIsGroupCall(true);

      const call = await initiateCallApi({ 
        group_id: groupId,
        call_type: type
      }).unwrap();
      setActiveCallId(call.id);
      setRemoteUser({ id: groupId, username: groupName });
      setParticipants(call.participants || []);
      setStatus(CallStatus.OUTGOING);
      toast({ title: `Starting group ${type} call in ${groupName}...` });
    } catch (error) {
      console.error("Failed to initiate group call:", error);
      toast({ title: `Failed to start group call`, variant: "destructive" });
    }
  };

  const addParticipantToCall = async (userId: string, username: string) => {
    if (!activeCallId) {
      toast({ title: "No active call", variant: "destructive" });
      return;
    }
    try {
      const call = await addParticipantApi({ callId: activeCallId, data: { user_id: userId } }).unwrap();
      setParticipants(call.participants || []);
      toast({ title: `${username} has been invited to the call` });
    } catch (error: any) {
      const msg = error?.data?.error || error?.data?.message || "Failed to add participant";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const acceptCall = async () => {
    if (!activeCallId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: callType === 'video', 
        audio: true 
      });
      setLocalStream(stream);
      
      await acceptCallApi(activeCallId).unwrap();
      setStatus(CallStatus.ACTIVE);
    } catch (error) {
      console.error("Failed to accept call:", error);
      toast({ title: `Failed to access ${callType === 'video' ? 'camera/' : ''}microphone`, variant: "destructive" });
    }
  };

  const rejectCall = async () => {
    if (!activeCallId) return;
    try {
      await rejectCallApi(activeCallId).unwrap();
      cleanup();
    } catch (error) {
      console.error("Failed to reject call:", error);
      cleanup();
    }
  };

  const endCall = async () => {
    if (!activeCallId) return;
    try {
      await endCallApi(activeCallId).unwrap();
      cleanup();
    } catch (error) {
      console.error("Failed to end call:", error);
      cleanup();
    }
  };

  return {
    status,
    callType,
    activeCallId,
    remoteUser,
    localStream,
    remoteStream,
    participants,
    isGroupCall,
    initiateCall,
    initiateGroupCall,
    addParticipantToCall,
    acceptCall,
    rejectCall,
    endCall,
  };
};
