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
import { MediaEngine, MediaType } from '@/lib/mediaEngine';

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
  
  const statusRef = useRef<CallStatus>(CallStatus.IDLE);
  const mediaWs = useRef<WebSocket | null>(null);
  const mediaEngine = useRef<MediaEngine | null>(null);
  const remoteVideoWriter = useRef<any>(null);
  
  const { toast } = useToast();

  const [initiateCallApi] = useInitiateCallMutation();
  const [acceptCallApi] = useAcceptCallMutation();
  const [rejectCallApi] = useRejectCallMutation();
  const [endCallApi] = useEndCallMutation();
  const [addParticipantApi] = useAddParticipantMutation();

  const updateStatus = useCallback((newStatus: CallStatus) => {
    setStatus(newStatus);
    statusRef.current = newStatus;
  }, []);

  const cleanup = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    if (mediaWs.current) {
      mediaWs.current.close();
      mediaWs.current = null;
    }
    if (mediaEngine.current) {
      mediaEngine.current.destroy();
      mediaEngine.current = null;
    }
    remoteVideoWriter.current = null;
    
    updateStatus(CallStatus.IDLE);
    setActiveCallId(null);
    setRemoteUser(null);
    setParticipants([]);
    setIsGroupCall(false);
  }, [localStream, remoteStream, updateStatus]);

  const connectToMediaRelay = useCallback((path: string, currentLocalStream: MediaStream | null) => {
    if (mediaWs.current) mediaWs.current.close();

    const baseUrl = wsService.getUrl().replace('wss://', '').replace('ws://', '').split('/api/')[0];
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const fullUrl = `${protocol}//${baseUrl}${path}`;
    const token = localStorage.getItem("authToken");

    console.log(`Connecting to media relay: ${fullUrl}`);
    const socket = new WebSocket(`${fullUrl}${token ? `?token=${token}` : ''}`);
    socket.binaryType = 'arraybuffer';

    // Initialize MediaEngine
    const onFrame = (userId: string, type: MediaType, frame: any) => {
      if (type === MediaType.VIDEO && remoteVideoWriter.current) {
        remoteVideoWriter.current.write(frame);
      } else {
        frame.close();
      }
    };

    const engine = new MediaEngine(socket, currentUserId, onFrame);
    mediaEngine.current = engine;

    socket.onopen = () => {
      console.log("Media relay connected");
      
      // Create remote track generator
      if ((window as any).MediaStreamTrackGenerator) {
        const videoGenerator = new (window as any).MediaStreamTrackGenerator({ kind: 'video' });
        remoteVideoWriter.current = videoGenerator.writable.getWriter();
        setRemoteStream(new MediaStream([videoGenerator]));
      }

      // Start encoding local stream
      if (currentLocalStream && engine) {
        engine.startEncoding(currentLocalStream);
      }
    };

    socket.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer && mediaEngine.current) {
        mediaEngine.current.handleIncomingData(event.data);
      }
    };

    socket.onclose = () => {
      console.log("Media relay closed");
    };

    mediaWs.current = socket;
  }, [currentUserId]);

  // Handle incoming signaling messages from the main WebSocket
  useEffect(() => {
    const unsubInitiated = wsService.subscribe(WsMessageType.CallInitiated, (data) => {
      if (data.receiver_id === currentUserId) {
        setActiveCallId(data.call_id);
        setCallType(data.call_type as 'video' | 'voice');
        setRemoteUser({ id: data.caller_id, username: data.caller_username || 'User' });
        updateStatus(CallStatus.INCOMING);
      }
    });

    const unsubAccepted = wsService.subscribe(WsMessageType.CallAccepted, (data) => {
      if (statusRef.current === CallStatus.OUTGOING && data.call_id === activeCallId) {
        updateStatus(CallStatus.ACTIVE);
        if (data.media_ws_path) {
          connectToMediaRelay(data.media_ws_path, localStream);
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
      unsubRejected();
      unsubEnded();
    };
  }, [currentUserId, activeCallId, connectToMediaRelay, cleanup, toast, updateStatus, localStream]);

  const initiateCall = async (receiverId: string, receiverUsername: string, type: 'video' | 'voice' = 'video') => {
    try {
      let stream;
      try {
        console.log(`Requesting media permissions for ${type} call...`);
        const constraints = { 
          video: type === 'video' ? { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
          } : false, 
          audio: true 
        };
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn("Primary constraints failed, retrying with minimal constraints:", err);
          // Fallback to minimal constraints to at least trigger the permission prompt
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: type === 'video', 
            audio: true 
          });
        }
      } catch (mediaError) {
        console.error("Final media access error:", mediaError);
        toast({ 
          title: `Unable to access camera/microphone`, 
          description: "Please check your browser settings and ensure no other application is using your camera.", 
          variant: "destructive" 
        });
        return;
      }
      
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
      updateStatus(CallStatus.OUTGOING);
    } catch (error: any) {
      const msg = error?.data?.error || error?.data?.message || "Failed to initiate call";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const initiateGroupCall = async (groupId: string, groupName: string, type: 'video' | 'voice' = 'video') => {
    try {
      let stream;
      try {
        console.log(`Requesting media permissions for group ${type} call...`);
        const constraints = { 
          video: type === 'video' ? { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
          } : false, 
          audio: true 
        };
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn("Group call constraints failed, retrying minimal:", err);
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: type === 'video', 
            audio: true 
          });
        }
      } catch (mediaError) {
        console.error("Media access error (group):", mediaError);
        toast({ 
          title: `Camera/Microphone failure`, 
          description: "Could not start media. Check your browser permissions.", 
          variant: "destructive" 
        });
        return;
      }

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
      updateStatus(CallStatus.OUTGOING);
    } catch (error: any) {
      const msg = error?.data?.error || error?.data?.message || "Failed to start group call";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const addParticipantToCall = async (userId: string, username: string) => {
    if (!activeCallId) return;
    try {
      const call = await addParticipantApi({ callId: activeCallId, data: { user_id: userId } }).unwrap();
      setParticipants(call.participants || []);
      toast({ title: `${username} has been invited` });
    } catch (error: any) {
      toast({ title: "Failed to add participant", variant: "destructive" });
    }
  };

  const acceptCall = async () => {
    if (!activeCallId) return;
    try {
      let stream;
      try {
        console.log(`Requesting media permissions for ${callType} call (accepting)...`);
        const constraints = { 
          video: callType === 'video' ? { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
          } : false, 
          audio: true 
        };

        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn("Accept call constraints failed, retrying minimal:", err);
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: callType === 'video', 
            audio: true 
          });
        }
      } catch (mediaError) {
        console.error("Media access error (accept):", mediaError);
        toast({ 
          title: `Failed to join call`, 
          description: "Could not access your camera or microphone. Please check permissions.", 
          variant: "destructive" 
        });
        return;
      }

      setLocalStream(stream);
      const call = await acceptCallApi(activeCallId).unwrap();
      
      const mediaPath = (call as any).media_ws_path;
      if (mediaPath) {
        connectToMediaRelay(mediaPath, stream);
      }
      
      updateStatus(CallStatus.ACTIVE);
    } catch (error: any) {
      const msg = error?.data?.error || error?.data?.message || "Failed to accept call";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const rejectCall = async () => {
    if (!activeCallId) return;
    try {
      wsService.rejectCall(activeCallId);
      cleanup();
    } catch (error) {
      cleanup();
    }
  };

  const endCall = async () => {
    if (!activeCallId) return;
    try {
      wsService.endCall(activeCallId);
      cleanup();
    } catch (error) {
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
