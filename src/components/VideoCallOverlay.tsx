import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CallStatus } from '@/hooks/useVideoCall';
import { type CallParticipant } from '@/store/api/videoCallApi';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff,
  Mic, 
  MicOff, 
  UserPlus, 
  Users, 
  X, 
  Maximize2, 
  Minimize2,
  Lock,
  Volume2,
  VolumeX,
  Camera
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface VideoCallOverlayProps {
  status: CallStatus;
  callType: 'video' | 'voice';
  remoteUser: { username: string; avatar_url?: string } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  participants: CallParticipant[];
  isGroupCall: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onAddParticipant?: (userId: string, username: string) => void;
  availableUsers?: { id: string; username: string; avatar_url?: string }[];
  availableDevices?: MediaDeviceInfo[];
  selectedAudioInput?: string;
  selectedAudioOutput?: string;
  selectedVideoInput?: string;
  onSwitchCamera?: (deviceId: string) => void;
  onSwitchMicrophone?: (deviceId: string) => void;
  onFlipCamera?: () => void;
  onSwitchAudioOutput?: (deviceId: string) => void;
  remoteCanvasRef?: React.RefObject<HTMLCanvasElement>;
}

export const VideoCallOverlay: React.FC<VideoCallOverlayProps> = ({
  status,
  callType,
  remoteUser,
  localStream,
  remoteStream,
  participants,
  isGroupCall,
  onAccept,
  onReject,
  onEnd,
  onAddParticipant,
  availableUsers = [],
  availableDevices = [],
  selectedAudioInput = '',
  selectedAudioOutput = '',
  selectedVideoInput = '',
  onSwitchCamera,
  onSwitchMicrophone,
  onFlipCamera,
  onSwitchAudioOutput,
  remoteCanvasRef: externalRemoteCanvasRef,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const internalRemoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const remoteCanvasRef = externalRemoteCanvasRef || internalRemoteCanvasRef;

  const [showParticipants, setShowParticipants] = useState(false);
  const [searchUsers, setSearchUsers] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [duration, setDuration] = useState(0);

  // Timer for active call
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === CallStatus.ACTIVE) {
      interval = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(e => console.log("Local video play blocked:", e));
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(e => console.log("Remote video play blocked:", e));
    }
    // Also set stream to the hidden audio element for voice calls
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(e => console.log("Remote audio play blocked:", e));
    }
  }, [remoteStream]);

  // Handle switching audio output (speaker/bluetooth)
  useEffect(() => {
    // Apply to both elements for maximum compatibility
    [remoteVideoRef.current, remoteAudioRef.current].forEach((element: any) => {
      if (element && selectedAudioOutput && element.setSinkId) {
        element.setSinkId(selectedAudioOutput)
          .then(() => console.log(`Audio output switched to ${selectedAudioOutput}`))
          .catch((err: any) => console.error("Error setting sink ID:", err));
      }
    });
  }, [selectedAudioOutput]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  if (status === CallStatus.IDLE) return null;

  const isVideo = callType === 'video';
  const participantIds = new Set(participants.map(p => p.user_id));
  const filteredUsers = availableUsers.filter(u =>
    !participantIds.has(u.id) &&
    u.username.toLowerCase().includes(searchUsers.toLowerCase())
  );

  // WhatsApp-style Incoming Call Screen
  if (status === CallStatus.INCOMING) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-between py-8 sm:py-20 bg-zinc-900 text-white overflow-hidden"
      >
        {/* Animated Background Pulse */}
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-20">
          <motion.div 
            animate={{ scale: [1, 2, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-[300px] h-[300px] bg-primary rounded-full blur-[100px]"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-white/10 relative z-10">
              <AvatarImage src={remoteUser?.avatar_url} />
              <AvatarFallback className="text-4xl sm:text-5xl bg-primary">
                {remoteUser?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          
          <h2 className="mt-8 text-3xl font-bold">{remoteUser?.username}</h2>
          <p className="mt-2 text-primary flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Incoming {isVideo ? 'Video' : 'Voice'} Call
          </p>
        </div>

        <div className="relative z-10 w-full max-w-xs flex justify-around items-center px-4">
          <div className="flex flex-col items-center gap-2 sm:gap-3">
            <Button
              onClick={onReject}
              size="lg"
              variant="destructive"
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-xl hover:scale-110 transition-transform active:scale-95"
            >
              <PhoneOff className="h-7 w-7 sm:h-8 sm:w-8" />
            </Button>
            <span className="text-xs sm:text-sm font-medium text-zinc-400">Decline</span>
          </div>

          <div className="flex flex-col items-center gap-2 sm:gap-3">
            <Button
              onClick={onAccept}
              size="lg"
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-green-500 hover:bg-green-600 shadow-xl shadow-green-500/20 hover:scale-110 transition-transform active:scale-95 animate-bounce"
            >
              <Phone className="h-7 w-7 sm:h-8 sm:w-8 text-white fill-white" />
            </Button>
            <span className="text-xs sm:text-sm font-medium text-green-400">Accept</span>
          </div>
        </div>

        <p className="relative z-10 text-xs text-zinc-500 flex items-center gap-1">
          <Lock className="h-3 w-3" /> End-to-end encrypted
        </p>
      </motion.div>
    );
  }

  // Active or Outgoing Call Screen (Full Overlay)
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          width: isMinimized ? '240px' : '100%',
          height: isMinimized ? '320px' : '100%',
          bottom: isMinimized ? '20px' : '0',
          right: isMinimized ? '20px' : '0',
          top: isMinimized ? 'auto' : '0',
          left: isMinimized ? 'auto' : '0',
        }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "fixed z-[100] bg-zinc-950 flex flex-col overflow-hidden text-white transition-all duration-300 shadow-2xl",
          !isMinimized && "inset-0",
          isMinimized && "rounded-2xl border border-white/10"
        )}
      >
        {/* Main Content */}
        <div className="relative flex-1 bg-black flex items-center justify-center group">
          {isVideo && (
            <div className={cn("w-full h-full", status !== CallStatus.ACTIVE && "hidden")}>
              {/* Try Video element first (Generator support) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={cn("w-full h-full object-cover", !remoteStream && "hidden")}
              />
              {/* Fallback to Canvas (No Generator support, e.g. Safari) */}
              <canvas
                ref={remoteCanvasRef}
                className={cn("w-full h-full object-cover", remoteStream && "hidden")}
              />
            </div>
          )}
          
          {(!isVideo || status !== CallStatus.ACTIVE) && (
            <div className="flex flex-col items-center">
              <motion.div 
                animate={status === CallStatus.ACTIVE ? { 
                  scale: [1, 1.05, 1],
                  transition: { duration: 4, repeat: Infinity } 
                } : {}}
              >
                <Avatar className={cn(
                  "border-4 border-white/5 transition-all duration-500",
                  !isMinimized ? "h-48 w-48" : "h-20 w-20"
                )}>
                  <AvatarImage src={remoteUser?.avatar_url} />
                  <AvatarFallback className="text-6xl bg-primary">
                    {remoteUser?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              
              {!isMinimized && (
                <div className="mt-8 text-center">
                  <h2 className="text-3xl font-bold">{remoteUser?.username}</h2>
                  <p className="mt-2 text-zinc-400 font-medium tracking-wider">
                    {status === CallStatus.OUTGOING ? "CALLING..." : formatDuration(duration)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Local Video - Picture-in-Picture */}
          {isVideo && localStream && !isMinimized && (
            <div 
              className="absolute bottom-36 right-4 sm:bottom-32 sm:right-6 w-28 sm:w-48 xl:w-64 aspect-[3/4] sm:aspect-video bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border-2 border-primary/50 z-20 pointer-events-none"
            >
              {isVideoOff ? (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                  <VideoOff className="h-6 sm:h-8 w-6 sm:w-8 text-zinc-600" />
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover -scale-x-100"
                />
              )}
            </div>
          )}

          {/* Overlay Head (Top Controls) */}
          {!isMinimized && (
            <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full text-white hover:bg-white/10"
                  onClick={() => setIsMinimized(true)}
                >
                  <Minimize2 className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Lock className="h-3 w-3" /> 
                  <span>Encrypted</span>
                </div>
              </div>

              {isVideo && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full text-white hover:bg-white/10"
                  onClick={() => setShowParticipants(!showParticipants)}
                >
                  <Users className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <motion.div 
          animate={isMinimized ? { height: 0, opacity: 0, padding: 0 } : { height: 'auto', opacity: 1 }}
          className="bg-zinc-900 border-t border-white/5 px-4 sm:px-8 py-6 sm:py-10 flex items-center justify-center gap-4 sm:gap-12"
        >
          {/* Mute Button */}
          <div className="flex flex-col items-center gap-1.5 sm:gap-2">
            <Button
              size="icon"
              onClick={toggleMute}
              className={cn(
                "h-12 w-12 sm:h-14 sm:w-14 rounded-full transition-all border border-white/5",
                isMuted ? "bg-white text-black hover:bg-white/90" : "bg-zinc-800 text-white hover:bg-zinc-700"
              )}
            >
              {isMuted ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6" />}
            </Button>
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Mute</span>
          </div>

          {/* Video Toggle (only for video calls) */}
          {isVideo && (
            <div className="flex flex-col items-center gap-1.5 sm:gap-2">
              <Button
                size="icon"
                onClick={toggleVideo}
                className={cn(
                  "h-12 w-12 sm:h-14 sm:w-14 rounded-full transition-all border border-white/5",
                  isVideoOff ? "bg-white text-black hover:bg-white/90" : "bg-zinc-800 text-white hover:bg-zinc-700"
                )}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Video className="h-5 w-5 sm:h-6 sm:w-6" />}
              </Button>
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Video</span>
            </div>
          )}

          {/* Hang Up Button */}
          <div className="flex flex-col items-center gap-1.5 sm:gap-2">
            <Button
              onClick={onEnd}
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-red-600 hover:bg-red-700 shadow-xl shadow-red-600/20 hover:scale-110 active:scale-95 transition-all group"
            >
              <PhoneOff className="h-7 w-7 sm:h-8 sm:w-8 text-white group-hover:rotate-[135deg] transition-transform duration-300" />
            </Button>
            <span className="text-[9px] sm:text-[10px] font-bold text-red-500 tracking-widest uppercase">End</span>
          </div>

          {/* Speaker Toggle (Mock) */}
          <div className="flex flex-col items-center gap-2">
            <Button
              size="icon"
              className={cn(
                "h-14 w-14 rounded-full transition-all border border-white/5",
                showSettings ? "bg-primary text-white" : "bg-zinc-800 text-white hover:bg-zinc-700"
              )}
              onClick={() => setShowSettings(!showSettings)}
            >
              <Volume2 className="h-6 w-6" />
            </Button>
            <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Audio</span>
          </div>

          {/* Switch Camera */}
          {isVideo && (
            <div className="flex flex-col items-center gap-1.5 sm:gap-2">
              <Button
                size="icon"
                onClick={onFlipCamera}
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 border border-white/5 active:rotate-180 transition-transform duration-500"
              >
                <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Switch</span>
            </div>
          )}
        </motion.div>

        {/* Minimized Controls (only shown when minimized) */}
        {isMinimized && (
          <div className="absolute inset-0 flex items-center justify-center group bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
            <div className="flex gap-4">
              <Button size="icon" className="rounded-full bg-white text-zinc-900" onClick={() => setIsMinimized(false)}>
                <Maximize2 className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="destructive" className="rounded-full" onClick={onEnd}>
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Participants Sidebar */}
        <AnimatePresence>
          {showParticipants && !isMinimized && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute top-0 right-0 h-full w-72 bg-zinc-900/95 backdrop-blur-xl border-l border-white/5 shadow-2xl z-[60] flex flex-col p-6"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">In Call</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowParticipants(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              
              <div className="flex flex-col gap-4">
                {participants.map(p => (
                  <div key={p.user_id} className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary">{p.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{p.username}</p>
                      <p className="text-xs text-zinc-500">{p.role === 'caller' ? 'Host' : 'Participant'}</p>
                    </div>
                  </div>
                ))}
              </div>

              {onAddParticipant && (
                <div className="mt-auto pt-6 border-t border-white/5">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Add to call</p>
                  <div className="relative">
                    <Input 
                      placeholder="Search users..." 
                      className="bg-zinc-800 border-none rounded-xl pr-10" 
                    />
                    <UserPlus className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden Audio element for persistent audio projection (especially for voice-only calls) */}
        <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

        {/* Device Settings Dialog */}
        <AnimatePresence>
          {showSettings && !isMinimized && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[320px] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-6 z-[70]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Audio & Video Settings</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Microphones */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Mic className="h-3 w-3" /> Microphone
                  </p>
                  <div className="space-y-1">
                    {availableDevices.filter(d => d.kind === 'audioinput').map(device => (
                      <button
                        key={device.deviceId}
                        onClick={() => onSwitchMicrophone?.(device.deviceId)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                          selectedAudioInput === device.deviceId ? "bg-primary/20 text-primary" : "hover:bg-white/5"
                        )}
                      >
                        {device.label || `Microphone ${device.deviceId.slice(0, 4)}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speakers */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Volume2 className="h-3 w-3" /> Output (Speaker/BT)
                  </p>
                  <div className="space-y-1">
                    {availableDevices.filter(d => d.kind === 'audiooutput' || (d.kind as any) === 'audio' ).map(device => (
                      <button
                        key={device.deviceId}
                        onClick={() => onSwitchAudioOutput?.(device.deviceId)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                          selectedAudioOutput === device.deviceId ? "bg-primary/20 text-primary" : "hover:bg-white/5"
                        )}
                      >
                        {device.label || `Speaker ${device.deviceId.slice(0, 4)}`}
                      </button>
                    ))}
                    {availableDevices.filter(d => d.kind === 'audiooutput').length === 0 && (
                      <p className="text-xs text-zinc-600 italic px-3">Browser default output</p>
                    )}
                  </div>
                </div>

                {/* Cameras */}
                {isVideo && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Camera className="h-3 w-3" /> Camera
                    </p>
                    <div className="space-y-1">
                      {availableDevices.filter(d => d.kind === 'videoinput').map(device => (
                        <button
                          key={device.deviceId}
                          onClick={() => onSwitchCamera?.(device.deviceId)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                            selectedVideoInput === device.deviceId ? "bg-primary/20 text-primary" : "hover:bg-white/5"
                          )}
                        >
                          {device.label || `Camera ${device.deviceId.slice(0, 4)}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
