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
  const remoteAudioWriter = useRef<any>(null);
  
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
    remoteAudioWriter.current = null;
    
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
      } else if (type === MediaType.AUDIO && remoteAudioWriter.current) {
        remoteAudioWriter.current.write(frame);
      } else {
        frame.close();
      }
    };

    const engine = new MediaEngine(socket, currentUserId, onFrame);
    mediaEngine.current = engine;

    socket.onopen = () => {
      console.log("Media relay connected");
      
      const tracks: MediaStreamTrack[] = [];

      // Create remote track generators
      if ((window as any).MediaStreamTrackGenerator) {
        // Video Generator
        const videoGenerator = new (window as any).MediaStreamTrackGenerator({ kind: 'video' });
        remoteVideoWriter.current = videoGenerator.writable.getWriter();
        tracks.push(videoGenerator);

        // Audio Generator
        const audioGenerator = new (window as any).MediaStreamTrackGenerator({ kind: 'audio' });
        remoteAudioWriter.current = audioGenerator.writable.getWriter();
        tracks.push(audioGenerator);

        setRemoteStream(new MediaStream(tracks));
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
      // Handle both flat and nested payload structures
      const payload = data.payload || data.content || data;
      const receiverId = payload.receiver_id || payload.receiverId || payload.recipient_id;
      const callerId = payload.caller_id || payload.callerId || payload.sender_id;
      
      console.log("Incoming call signal check:", { receiverId, currentUserId, payload });

      if (String(receiverId) === String(currentUserId)) {
        setActiveCallId(payload.call_id || payload.callId);
        setCallType((payload.call_type || payload.callType) as 'video' | 'voice');
        setRemoteUser({ 
          id: callerId, 
          username: payload.caller_username || payload.sender_username || 'User' 
        });
        updateStatus(CallStatus.INCOMING);
      }
    });

    const unsubAccepted = wsService.subscribe(WsMessageType.CallAccepted, (data) => {
      const payload = data.payload || data.content || data;
      const callId = payload.call_id || payload.callId;

      if (statusRef.current === CallStatus.OUTGOING && String(callId) === String(activeCallId)) {
        updateStatus(CallStatus.ACTIVE);
        if (payload.media_ws_path || payload.mediaWsPath) {
          connectToMediaRelay(payload.media_ws_path || payload.mediaWsPath, localStream);
        }
      }
    });

    const unsubRejected = wsService.subscribe(WsMessageType.CallRejected, (data) => {
      const payload = data.payload || data.content || data;
      const callId = payload.call_id || payload.callId;

      if (String(callId) === String(activeCallId)) {
        toast({ title: "Call Rejected", variant: "destructive" });
        cleanup();
      }
    });

    const unsubEnded = wsService.subscribe(WsMessageType.CallEnded, (data) => {
      const payload = data.payload || data.content || data;
      const callId = payload.call_id || payload.callId;

      if (String(callId) === String(activeCallId)) {
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

  // Comprehensive check for browser capabilities required for this architecture
  const checkCapabilities = useCallback(() => {
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    if (!isSecure) {
      toast({ 
        title: "Insecure Context", 
        description: "Camera access requires HTTPS. Please use an https:// URL.", 
        variant: "destructive" 
      });
      return false;
    }

    // On iOS, we MUST allow getUserMedia even if WebCodecs check is uncertain 
    // otherwise the permission prompt is suppressed.
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({ 
        title: "Unsupported Browser", 
        description: "Your browser doesn't support camera access. Try Chrome or Safari.", 
        variant: "destructive" 
      });
      return false;
    }

    return true;
  }, [toast]);

  // Helper for consistent media access across mobile and desktop
  const getMediaStream = async (type: 'video' | 'voice'): Promise<MediaStream> => {
    // Check basic security/availability but don't block on advanced features yet
    if (!checkCapabilities()) {
      throw new Error("Basic capabilities check failed");
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Simplest possible constraints for the highest success rate on iOS
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: type === 'video' ? (isMobile ? true : {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      }) : false
    };

    try {
      console.log(`Requesting media (${type}) with constraints:`, constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // AFTER we have the stream, we can warn about limited playback support if necessary
      const hasWebCodecs = (window as any).VideoEncoder && (window as any).VideoDecoder;
      if (!hasWebCodecs) {
        console.warn("WebCodecs not supported. Remote video may not render.");
        // We don't toast here to avoid interrupting the call flow
      }

      return stream;
    } catch (err) {
      console.warn("Primary media request failed, retrying with raw true/true...", err);
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
    }
  };

  const initiateCall = async (receiverId: string, receiverUsername: string, type: 'video' | 'voice' = 'video') => {
    // Instant UI feedback - prioritize showing the calling screen
    setCallType(type);
    setRemoteUser({ id: receiverId, username: receiverUsername });
    setIsGroupCall(false);
    updateStatus(CallStatus.OUTGOING);

    try {
      // Background: request media
      let stream;
      try {
        stream = await getMediaStream(type);
      } catch (mediaError) {
        console.error("Final media access error:", mediaError);
        toast({ 
          title: `Camera/Mic Blocked`, 
          description: "Please tap the 'Aa' or 'Lock' icon in your browser address bar and ensure Camera/Mic access is allowed.", 
          variant: "destructive" 
        });
        cleanup(); // Fallback to idle if media fails
        return;
      }
      
      setLocalStream(stream);

      // Background: notify server
      const call = await initiateCallApi({ 
        receiver_id: receiverId,
        call_type: type
      }).unwrap();
      
      setActiveCallId(call.id);
      setParticipants(call.participants || []);
    } catch (error: any) {
      const msg = error?.data?.error || error?.data?.message || "Failed to initiate call";
      toast({ title: msg, variant: "destructive" });
      cleanup(); // Fallback to idle if server call fails
    }
  };

  const initiateGroupCall = async (groupId: string, groupName: string, type: 'video' | 'voice' = 'video') => {
    // Instant UI feedback
    setCallType(type);
    setRemoteUser({ id: groupId, username: groupName });
    setIsGroupCall(true);
    updateStatus(CallStatus.OUTGOING);

    try {
      // Background: request media
      let stream;
      try {
        stream = await getMediaStream(type);
      } catch (mediaError) {
        console.error("Media access error (group):", mediaError);
        toast({ 
          title: `Camera/Microphone failure`, 
          description: "Could not start media. Check your browser permissions.", 
          variant: "destructive" 
        });
        cleanup();
        return;
      }

      setLocalStream(stream);

      // Background: notify server
      const call = await initiateCallApi({ 
        group_id: groupId,
        call_type: type
      }).unwrap();
      
      setActiveCallId(call.id);
      setParticipants(call.participants || []);
    } catch (error: any) {
      const msg = error?.data?.error || error?.data?.message || "Failed to start group call";
      toast({ title: msg, variant: "destructive" });
      cleanup();
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
        stream = await getMediaStream(callType);
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
    const callId = activeCallId;
    if (!callId) {
      cleanup();
      return;
    }
    
    try {
      // Signal via WebSocket
      wsService.rejectCall(callId);
      // Update backend state
      await rejectCallApi(callId).unwrap();
    } catch (error) {
      console.warn("Reject call API failed:", error);
    } finally {
      cleanup();
    }
  };

  const endCall = async () => {
    const callId = activeCallId;
    if (!callId) {
      cleanup();
      return;
    }

    try {
      // Signal via WebSocket
      wsService.endCall(callId);
      // Update backend state
      await endCallApi(callId).unwrap();
    } catch (error) {
      console.warn("End call API failed:", error);
    } finally {
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
