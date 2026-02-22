import React, { useEffect, useRef, useState } from 'react';
import { CallStatus } from '@/hooks/useVideoCall';
import { type CallParticipant } from '@/store/api/videoCallApi';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video, Mic, MicOff, UserPlus, Users, X } from 'lucide-react';
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
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [searchUsers, setSearchUsers] = useState('');

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (status === CallStatus.IDLE) return null;

  const isVideo = callType === 'video';
  const participantIds = new Set(participants.map(p => p.user_id));
  const filteredUsers = availableUsers.filter(u =>
    !participantIds.has(u.id) &&
    u.username.toLowerCase().includes(searchUsers.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className={cn(
        "relative w-full bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col",
        isVideo ? "max-w-4xl aspect-video" : "max-w-md"
      )}>
        
        {/* Main Content Area */}
        <div className={cn(
          "relative flex-1 bg-zinc-800 flex items-center justify-center",
          !isVideo && "aspect-square py-12"
        )}>
          {/* Main Remote View */}
          {status === CallStatus.ACTIVE && remoteStream && isVideo ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <Avatar className={cn(
                  "border-4 border-white/10 shadow-2xl transition-all duration-500",
                  status === CallStatus.ACTIVE && !isVideo ? "h-48 w-48" : "h-32 w-32",
                  status === CallStatus.ACTIVE && !isVideo && "ring-4 ring-primary/20 ring-offset-4 ring-offset-zinc-800 animate-pulse"
                )}>
                  <AvatarImage src={remoteUser?.avatar_url} />
                  <AvatarFallback className="text-5xl bg-primary text-primary-foreground">
                    {remoteUser?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {status === CallStatus.ACTIVE && !isVideo && (
                  <div className="absolute -bottom-2 -right-2 bg-green-500 p-2 rounded-full shadow-lg">
                    <Mic className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
              
              <div className="text-center px-6">
                <h2 className="text-3xl font-bold text-white mb-2">{remoteUser?.username}</h2>
                <p className="text-zinc-400 font-medium">
                  {status === CallStatus.OUTGOING && (isGroupCall ? "Starting group call..." : "Calling...")}
                  {status === CallStatus.INCOMING && `Incoming ${isVideo ? 'Video' : 'Voice'} Call...`}
                  {status === CallStatus.ACTIVE && !isVideo && (isGroupCall ? "Group Voice Call" : "Voice Call in Progress")}
                </p>
                {/* Participant avatars for group call */}
                {isGroupCall && participants.length > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-3 flex-wrap">
                    {participants.slice(0, 5).map(p => (
                      <Avatar key={p.user_id} className="h-8 w-8 border-2 border-zinc-700">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-zinc-600 text-white">
                          {p.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {participants.length > 5 && (
                      <span className="text-xs text-zinc-400">+{participants.length - 5} more</span>
                    )}
                  </div>
                )}
              </div>

              {/* Hidden audio element for voice calls */}
              {!isVideo && (
                <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
              )}
            </div>
          )}

          {/* Local Video (Picture-in-Picture) */}
          {isVideo && (
            <div className={cn(
              "absolute bottom-6 right-6 w-1/4 aspect-video bg-black rounded-xl overflow-hidden shadow-xl border border-white/20 transition-all duration-500",
              status === CallStatus.INCOMING && "opacity-0 scale-90 translate-y-10"
            )}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Participants Sidebar (slides in) */}
          {showParticipants && (
            <div className="absolute top-0 right-0 h-full w-72 bg-zinc-900/95 backdrop-blur-md border-l border-white/10 flex flex-col p-4 gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Participants ({participants.length})</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={() => setShowParticipants(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Current participants */}
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {participants.map(p => (
                  <div key={p.user_id} className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {p.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-zinc-300 flex-1 truncate">{p.username}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      p.role === 'caller' ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                    )}>
                      {p.role === 'caller' ? 'Host' : 'In Call'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add user section */}
              {onAddParticipant && availableUsers.length > 0 && (
                <>
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-xs text-zinc-500 mb-2">Add to call</p>
                    <Input
                      placeholder="Search users..."
                      value={searchUsers}
                      onChange={e => setSearchUsers(e.target.value)}
                      className="h-8 text-sm bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
                    {filteredUsers.slice(0, 10).map(u => (
                      <button
                        key={u.id}
                        onClick={() => onAddParticipant(u.id, u.username)}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={u.avatar_url} />
                          <AvatarFallback className="text-xs bg-zinc-600 text-white">
                            {u.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-zinc-300 flex-1 truncate">{u.username}</span>
                        <UserPlus className="h-3.5 w-3.5 text-zinc-500" />
                      </button>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className="text-xs text-zinc-500 text-center py-4">No users to add</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-zinc-900/90 backdrop-blur-md p-6 sm:p-8 flex items-start justify-center gap-8 sm:gap-12">
          {status === CallStatus.INCOMING ? (
            <>
              <div className="flex flex-col items-center gap-2">
                <Button
                  size="lg"
                  variant="destructive"
                  className="h-16 w-16 sm:h-18 sm:w-18 rounded-full hover:scale-110 transition-transform shadow-lg shadow-destructive/20"
                  onClick={onReject}
                >
                  <PhoneOff className="h-7 w-7 sm:h-8 sm:w-8" />
                </Button>
                <span className="text-white text-xs font-medium tracking-wide opacity-80">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2 mt-[-20px]">
                <Button
                  size="lg"
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-green-500 hover:bg-green-600 shadow-xl shadow-green-500/30 hover:scale-110 transition-transform animate-pulse"
                  onClick={onAccept}
                >
                  <Phone className="h-10 w-10 sm:h-12 sm:w-12 text-white fill-white" />
                </Button>
                <span className="text-green-400 text-xs font-medium tracking-wide">Accept</span>
              </div>
            </>
          ) : status === CallStatus.OUTGOING ? (
            <div className="flex flex-col items-center gap-2">
              <Button
                size="lg"
                variant="destructive"
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full shadow-lg shadow-destructive/20 hover:scale-110 transition-transform"
                onClick={onEnd}
              >
                <PhoneOff className="h-7 w-7 sm:h-9 sm:w-9" />
              </Button>
              <span className="text-white text-xs font-medium tracking-wide opacity-80">Cancel</span>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white border border-white/5"
                >
                  <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </div>

              {/* Add Participant button (shown when active) */}
              {status === CallStatus.ACTIVE && onAddParticipant && (
                <div className="flex flex-col items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className={cn(
                      "h-12 w-12 sm:h-14 sm:w-14 rounded-full border border-white/5 text-white transition-colors",
                      showParticipants ? "bg-primary hover:bg-primary/80" : "bg-zinc-800 hover:bg-zinc-700"
                    )}
                    onClick={() => setShowParticipants(p => !p)}
                    title="Manage participants"
                  >
                    <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                </div>
              )}
              
              <div className="flex flex-col items-center justify-center gap-2">
                <Button
                  size="lg"
                  variant="destructive"
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-full shadow-lg shadow-destructive/20 hover:scale-110 transition-transform"
                  onClick={onEnd}
                >
                  <PhoneOff className="h-7 w-7 sm:h-9 sm:w-9" />
                </Button>
              </div>

              {isVideo ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white border border-white/5"
                  >
                    <Video className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white border border-white/5"
                  >
                    <Phone className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
