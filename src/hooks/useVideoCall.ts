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
// Removed MediaEngine imports since WebRTC handles this natively

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
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  
  const statusRef = useRef<CallStatus>(CallStatus.IDLE);
  const activeCallIdRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const mediaWs = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  
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

  const updateActiveCallId = useCallback((id: string | null) => {
    setActiveCallId(id);
    activeCallIdRef.current = id;
  }, []);

  const updateLocalStream = useCallback((stream: MediaStream | null) => {
    setLocalStream(stream);
    localStreamRef.current = stream;
  }, []);

  const updateRemoteStream = useCallback((stream: MediaStream | null) => {
    setRemoteStream(stream);
    remoteStreamRef.current = stream;
  }, []);

  const cleanup = useCallback(() => {
    // Stop all local tracks using the ref for 100% reliability
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind}`);
        track.stop();
      });
      updateLocalStream(null);
    }
    
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      updateRemoteStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (mediaWs.current) {
      mediaWs.current.close();
      mediaWs.current = null;
    }
    
    updateStatus(CallStatus.IDLE);
    updateActiveCallId(null);
    setRemoteUser(null);
    setParticipants([]);
    setIsGroupCall(false);
  }, [localStream, remoteStream, updateStatus, updateActiveCallId]);

  const connectToMediaRelay = useCallback((path: string, currentLocalStream: MediaStream | null, isInitiator: boolean = false) => {
    if (mediaWs.current) mediaWs.current.close();
    if (peerConnectionRef.current) peerConnectionRef.current.close();

    const originalWsUrl = wsService.getUrl();
    const baseUrl = originalWsUrl.replace('wss://', '').replace('ws://', '').split('/api/')[0];
    const protocol = originalWsUrl.startsWith('wss://') ? 'wss:' : 'ws:';
    const fullUrl = `${protocol}//${baseUrl}${path}`;
    const token = localStorage.getItem("authToken");

    console.log(`Connecting to WebRTC signaling: ${fullUrl}`);
    const socket = new WebSocket(`${fullUrl}${token ? `?token=${token}` : ''}`);

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    peerConnectionRef.current = pc;

    if (currentLocalStream) {
      currentLocalStream.getTracks().forEach(track => {
        pc.addTrack(track, currentLocalStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      updateRemoteStream(event.streams[0]);
    };

    socket.onopen = async () => {
      console.log("WebRTC signaling connected");
      if (isInitiator) {
         try {
           const offer = await pc.createOffer();
           await pc.setLocalDescription(offer);
           socket.send(JSON.stringify({ type: 'offer', offer }));
         } catch(e) { console.error("Error creating WebRTC offer", e); }
      }
    };

    socket.onmessage = async (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.send(JSON.stringify({ type: 'answer', answer }));
        } else if (message.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
        } else if (message.type === 'ice-candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
      } catch (err) {
        console.error("Signaling error:", err);
      }
    };

    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30 seconds

    socket.onclose = () => {
      clearInterval(pingInterval);
      console.log("WebRTC signaling closed");
    };

    mediaWs.current = socket;
  }, [updateRemoteStream]);

  // Handle incoming signaling messages from the main WebSocket
  useEffect(() => {
    const unsubInitiated = wsService.subscribe(WsMessageType.CallInitiated, (data) => {
      // Handle both flat and nested payload structures
      const payload = data.payload || data.content || data;
      const receiverId = payload.receiver_id || payload.receiverId || payload.recipient_id;
      const callerId = payload.caller_id || payload.callerId || payload.sender_id;
      
      console.log("Incoming call signal check:", { receiverId, currentUserId, payload });

      if (String(receiverId) === String(currentUserId)) {
        updateActiveCallId(payload.call_id || payload.callId);
        setCallType((payload.call_type || payload.callType) as 'video' | 'voice');
        setRemoteUser({ 
          id: callerId, 
          username: payload.caller_username || payload.sender_username || 'User',
          avatar_url: payload.caller_avatar_url || payload.sender_avatar_url
        });
        updateStatus(CallStatus.INCOMING);
      }
    });

    const unsubAccepted = wsService.subscribe(WsMessageType.CallAccepted, (data) => {
      const payload = data.payload || data.content || data;
      const callId = payload.call_id || payload.callId;

      if (statusRef.current === CallStatus.OUTGOING && String(callId) === String(activeCallIdRef.current)) {
        updateStatus(CallStatus.ACTIVE);
        
        // Update remote user info from server signal
        setRemoteUser(prev => ({
          ...prev!,
          username: payload.receiver_username || payload.recipient_username || prev?.username || 'User',
          avatar_url: payload.receiver_avatar_url || payload.recipient_avatar_url || prev?.avatar_url
        }));

        if (payload.media_ws_path || payload.mediaWsPath) {
          connectToMediaRelay(payload.media_ws_path || payload.mediaWsPath, localStream, true);
        }
      }
    });

    const unsubRejected = wsService.subscribe(WsMessageType.CallRejected, (data) => {
      const payload = data.payload || data.content || data;
      const callId = payload.call_id || payload.callId;

      if (String(callId) === String(activeCallIdRef.current)) {
        toast({ title: "Call Rejected" });
        cleanup();
      }
    });

    const unsubEnded = wsService.subscribe(WsMessageType.CallEnded, (data) => {
      const payload = data.payload || data.content || data;
      const callId = payload.call_id || payload.callId;

      if (String(callId) === String(activeCallIdRef.current)) {
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
  }, [currentUserId, connectToMediaRelay, cleanup, toast, updateStatus, localStream]);

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
  
  // Helper to ensure AudioContext is active (must be called from a user interaction)
  const resumeAudio = useCallback(async () => {
    // Native WebRTC handles this automatically now
  }, []);

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices(devices);
      
      // Select defaults if not already set
      if (!selectedAudioInput) {
        const defaultMic = devices.find(d => d.kind === 'audioinput');
        if (defaultMic) setSelectedAudioInput(defaultMic.deviceId);
      }
      if (!selectedVideoInput) {
        const defaultCam = devices.find(d => d.kind === 'videoinput');
        if (defaultCam) setSelectedVideoInput(defaultCam.deviceId);
      }
      if (!selectedAudioOutput) {
        const defaultSpk = devices.find(d => d.kind === 'audiooutput');
        if (defaultSpk) setSelectedAudioOutput(defaultSpk.deviceId);
      }
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  }, [selectedAudioInput, selectedVideoInput, selectedAudioOutput]);

  // Update devices whenever a call starts or when they change
  useEffect(() => {
    if (status !== CallStatus.IDLE) {
      enumerateDevices();
      navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
      return () => navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    }
  }, [status, enumerateDevices]);

  const switchCamera = async (deviceId: string) => {
    if (!localStreamRef.current) return;
    if (selectedVideoInput === deviceId) return;

    try {
      console.log(`Switching camera to: ${deviceId}`);
      
      // 1. Explicitly stop only the video track first to release hardware
      const oldTracks = localStreamRef.current.getVideoTracks();
      oldTracks.forEach(t => t.stop());

      // 2. Request the new camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { ideal: deviceId } },
        audio: false
      });
      
      const newTrack = newStream.getVideoTracks()[0];
      
      // 3. Reconstruct the stream
      const currentAudioTrack = localStreamRef.current.getAudioTracks()[0];
      const newLocalStream = new MediaStream([newTrack]);
      if (currentAudioTrack) newLocalStream.addTrack(currentAudioTrack);
      
      updateLocalStream(newLocalStream);
      setSelectedVideoInput(deviceId);
      
      // 4. Update WebRTC PeerConnection
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find((s: any) => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(newTrack);
      }
    } catch (err) {
      console.error("Error switching camera:", err);
      toast({ title: "Failed to switch camera", variant: "destructive" });
      // Restore video if possible
      const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (localStreamRef.current) {
        localStreamRef.current.addTrack(fallbackStream.getVideoTracks()[0]);
        updateLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    }
  };

  const switchMicrophone = async (deviceId: string) => {
    if (!localStreamRef.current) return;
    if (selectedAudioInput === deviceId) return;

    try {
      console.log(`Switching microphone to: ${deviceId}`);
      
      // 1. Release the current audio hardware first (Critical for Mobile/BT)
      const oldTracks = localStreamRef.current.getAudioTracks();
      oldTracks.forEach(t => {
        t.enabled = false;
        t.stop();
      });

      // 2. Request the new microphone
      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { ideal: deviceId } },
          video: false
        });
      } catch (e) {
        console.warn("Retrying with generic audio constraint...");
        newStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }
      
      const newTrack = newStream.getAudioTracks()[0];
      
      // 3. Reconstruct the stream
      const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
      const newLocalStream = new MediaStream([newTrack]);
      if (currentVideoTrack) newLocalStream.addTrack(currentVideoTrack);
      
      updateLocalStream(newLocalStream);
      setSelectedAudioInput(deviceId);

      // 4. Update WebRTC PeerConnection
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find((s: any) => s.track && s.track.kind === "audio");
        if (sender) sender.replaceTrack(newTrack);
      }
      
      toast({ title: "Microphone Switched" });
    } catch (err) {
      console.error("Error switching microphone:", err);
      toast({ 
        title: "Microphone Swap Failed", 
        description: "Please ensure your headset is connected and not being used by another app.",
        variant: "destructive" 
      });
    }
  };

  const flipCamera = async () => {
    if (!availableDevices.length || !selectedVideoInput) return;
    
    const videoDevices = availableDevices.filter(d => d.kind === 'videoinput');
    if (videoDevices.length < 2) return;

    const currentIndex = videoDevices.findIndex(d => d.deviceId === selectedVideoInput);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];

    if (nextDevice) {
      await switchCamera(nextDevice.deviceId);
    }
  };

  // Helper for consistent media access across mobile and desktop
  const getMediaStream = async (type: 'video' | 'voice'): Promise<MediaStream> => {
    // Check basic security/availability but don't block on advanced features yet
    if (!checkCapabilities()) {
      throw new Error("Basic capabilities check failed");
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Stage 1: Balanced constraints
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: type === 'video' ? {
        facingMode: 'user',
        width: isMobile ? { ideal: 640 } : { ideal: 1280 },
        height: isMobile ? { ideal: 480 } : { ideal: 720 },
      } : false
    };

    try {
      console.log(`Requesting media (${type}) stage 1...`);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Stream obtained successfully:", {
        id: stream.id,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      return stream;
    } catch (err) {
      console.warn("Media stage 1 failed, trying stage 2 (raw user camera)...", err);
      try {
        // Stage 2: Most basic camera request
        return await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video' ? { facingMode: 'user' } : false
        });
      } catch (err2) {
        console.warn("Media stage 2 failed, trying stage 3 (any camera)...", err2);
        // Stage 3: Absolutely anything that works
        return await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video'
        });
      }
    }
  };

  const initiateCall = async (receiverId: string, receiverUsername: string, type: 'video' | 'voice' = 'video', avatarUrl?: string) => {
    // Instant UI feedback - prioritize showing the calling screen
    await resumeAudio();
    setCallType(type);
    setRemoteUser({ id: receiverId, username: receiverUsername, avatar_url: avatarUrl });
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
      
      updateLocalStream(stream);

      // Background: notify server
      const call = await initiateCallApi({ 
        receiver_id: receiverId,
        call_type: type
      }).unwrap();
      
      updateActiveCallId(call.id);
      setParticipants(call.participants || []);
    } catch (error: any) {
      const msg = error?.data?.error || error?.data?.message || "Failed to initiate call";
      toast({ title: msg, variant: "destructive" });
      cleanup(); // Fallback to idle if server call fails
    }
  };

  const initiateGroupCall = async (groupId: string, groupName: string, type: 'video' | 'voice' = 'video', avatarUrl?: string) => {
    // Instant UI feedback
    await resumeAudio();
    setCallType(type);
    setRemoteUser({ id: groupId, username: groupName, avatar_url: avatarUrl });
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

      updateLocalStream(stream);

      // Background: notify server
      const call = await initiateCallApi({ 
        group_id: groupId,
        call_type: type
      }).unwrap();
      
      updateActiveCallId(call.id);
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
    if (!activeCallId || statusRef.current === CallStatus.ACTIVE) return;
    
    await resumeAudio();
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

      updateLocalStream(stream);
      let call;
      try {
        call = await acceptCallApi(activeCallId).unwrap();
      } catch (apiError: any) {
        const errorMsg = apiError?.data?.error || apiError?.data?.message || "";
        if (errorMsg.toLowerCase().includes("active")) {
          // If the backend says call is already active, we can proceed to active status
          updateStatus(CallStatus.ACTIVE);
          return;
        }
        throw apiError;
      }
      
      const mediaPath = (call as any).media_ws_path;
      if (mediaPath) {
        connectToMediaRelay(mediaPath, stream, false);
      }
      
      updateStatus(CallStatus.ACTIVE);
      
      // Explicitly notify caller via WebSocket signaling
      wsService.acceptCall(activeCallId);
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
    availableDevices,
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,
    switchCamera,
    switchMicrophone,
    flipCamera,
    setSelectedAudioOutput,
    remoteCanvasRef,
  };
};
