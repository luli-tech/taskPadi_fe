/**
 * MediaEngine handles encoding and decoding of media packets for the NATS media relay.
 * It uses the WebCodecs API (VideoEncoder, VideoDecoder, AudioEncoder, AudioDecoder) 
 * and a minimalist binary implementation of the videocall-rs Protobuf schema.
 */

// Type definitions for WebCodecs if missing from TS lib
declare var AudioData: any;
declare var VideoFrame: any;
declare var VideoEncoder: any;
declare var VideoDecoder: any;
declare var AudioEncoder: any;
declare var AudioDecoder: any;
declare var EncodedVideoChunk: any;
declare var EncodedAudioChunk: any;

export enum MediaType {
  UNKNOWN = 0,
  VIDEO = 1,
  AUDIO = 2,
  SCREEN = 3,
  HEARTBEAT = 4,
  RTT = 5,
}

export interface MediaPacket {
  mediaType: MediaType;
  senderId: string;
  data: Uint8Array;
  frameType?: string;
  timestamp: number;
}

/**
 * Minimalist manual Protobuf encoder for MediaPacket.
 * Matches: videocall-rs/protobuf/types/media_packet.proto
 */
class MediaPacketSerializer {
  static encode(packet: MediaPacket): Uint8Array {
    const parts: Uint8Array[] = [];

    // 1: media_type (varint)
    parts.push(this.encodeVarint(1, packet.mediaType));
    
    // 2: email/senderId (string)
    parts.push(this.encodeString(2, packet.senderId));
    
    // 3: data (bytes)
    parts.push(this.encodeBytes(3, packet.data));
    
    // 4: frame_type (string)
    if (packet.frameType) {
      parts.push(this.encodeString(4, packet.frameType));
    }
    
    // 5: timestamp (double - fixed 64-bit)
    parts.push(this.encodeDouble(5, packet.timestamp));

    const totalLength = parts.reduce((acc, part) => acc + part.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }
    return result;
  }

  static decode(buffer: Uint8Array): MediaPacket {
    let offset = 0;
    const packet: Partial<MediaPacket> = {
      mediaType: MediaType.UNKNOWN,
      timestamp: 0,
    };

    while (offset < buffer.length) {
      const header = buffer[offset++];
      const tag = header >> 3;
      const wireType = header & 0x07;

      switch (tag) {
        case 1: // media_type
          packet.mediaType = this.decodeVarint(buffer, offset).value;
          offset = this.decodeVarint(buffer, offset).nextOffset;
          break;
        case 2: // email/senderId
          const strRes = this.decodeString(buffer, offset);
          packet.senderId = strRes.value;
          offset = strRes.nextOffset;
          break;
        case 3: // data
          const byteRes = this.decodeBytes(buffer, offset);
          packet.data = byteRes.value;
          offset = byteRes.nextOffset;
          break;
        case 4: // frame_type
          const ftRes = this.decodeString(buffer, offset);
          packet.frameType = ftRes.value;
          offset = ftRes.nextOffset;
          break;
        case 5: // timestamp
          packet.timestamp = new DataView(buffer.buffer, buffer.byteOffset + offset, 8).getFloat64(0, true);
          offset += 8;
          break;
        default:
          // Skip unknown tags
          if (wireType === 0) offset = this.decodeVarint(buffer, offset).nextOffset;
          else if (wireType === 2) offset = this.decodeBytes(buffer, offset).nextOffset;
          else if (wireType === 1) offset += 8;
          else if (wireType === 5) offset += 4;
          else throw new Error("Unsupported wire type");
      }
    }

    return packet as MediaPacket;
  }

  private static encodeVarint(tag: number, value: number): Uint8Array {
    const header = (tag << 3) | 0;
    const res = [header];
    let v = value;
    while (v >= 0x80) {
      res.push((v & 0x7f) | 0x80);
      v >>= 7;
    }
    res.push(v);
    return new Uint8Array(res);
  }

  private static decodeVarint(buffer: Uint8Array, offset: number) {
    let value = 0;
    let shift = 0;
    let i = offset;
    while (true) {
      const b = buffer[i++];
      value |= (b & 0x7f) << shift;
      if (!(b & 0x80)) break;
      shift += 7;
    }
    return { value, nextOffset: i };
  }

  private static encodeString(tag: number, value: string): Uint8Array {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    return this.encodeBytes(tag, data);
  }

  private static decodeString(buffer: Uint8Array, offset: number) {
    const res = this.decodeBytes(buffer, offset);
    const decoder = new TextDecoder();
    return { value: decoder.decode(res.value), nextOffset: res.nextOffset };
  }

  private static encodeBytes(tag: number, data: Uint8Array): Uint8Array {
    const header = (tag << 3) | 2;
    const len = data.length;
    const lenHeader: number[] = [];
    let l = len;
    while (l >= 0x80) {
      lenHeader.push((l & 0x7f) | 0x80);
      l >>= 7;
    }
    lenHeader.push(l);
    
    const res = new Uint8Array(1 + lenHeader.length + data.length);
    res[0] = header;
    res.set(new Uint8Array(lenHeader), 1);
    res.set(data, 1 + lenHeader.length);
    return res;
  }

  private static decodeBytes(buffer: Uint8Array, offset: number) {
    const lenRes = this.decodeVarint(buffer, offset);
    const data = buffer.slice(lenRes.nextOffset, lenRes.nextOffset + lenRes.value);
    return { value: data, nextOffset: lenRes.nextOffset + lenRes.value };
  }

  private static encodeDouble(tag: number, value: number): Uint8Array {
    const header = (tag << 3) | 1;
    const res = new Uint8Array(9);
    res[0] = header;
    new DataView(res.buffer).setFloat64(1, value, true);
    return res;
  }
}

export type OnRemoteFrameCallback = (userId: string, type: MediaType, frame: any) => void;

export class MediaEngine {
  private videoEncoder: any = null;
  private audioEncoder: any = null;
  private videoDecoders: Map<string, any> = new Map();
  private audioDecoders: Map<string, any> = new Map();
  private ws: WebSocket;
  private localUserId: string;
  private onRemoteFrame: OnRemoteFrameCallback;
  private videoFrameCount = 0;

  constructor(ws: WebSocket, localUserId: string, onRemoteFrame: OnRemoteFrameCallback) {
    this.ws = ws;
    this.localUserId = localUserId;
    this.onRemoteFrame = onRemoteFrame;
  }

  async startEncoding(stream: MediaStream) {
    // Start Video Encoding
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      this.setupVideoEncoder(videoTrack);
    }

    // Start Audio Encoding
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      this.setupAudioEncoder(audioTrack);
    }
  }

  private async setupVideoEncoder(track: MediaStreamTrack) {
    const settings = track.getSettings();
    const width = settings.width || 1280;
    const height = settings.height || 720;

    this.videoEncoder = new VideoEncoder({
      output: (chunk: any, metadata: any) => this.handleEncodedChunk(chunk, metadata, MediaType.VIDEO),
      error: (e: any) => console.error("VideoEncoder error", e),
    });

    this.videoEncoder.configure({
      codec: 'avc1.42E01E', // H.264 Baseline - Highly compatible with Mobile/iOS
      width,
      height,
      bitrate: 1_000_000,
      latencyMode: 'realtime',
      avc: { format: 'annexb' } // Annex B is preferred for relay streaming
    });

    const processor = new (window as any).MediaStreamTrackProcessor({ track });
    const reader = processor.readable.getReader();

    const encodeLoop = async () => {
      while (true) {
        const { done, value: frame } = await reader.read();
        if (done) break;
        if (this.videoEncoder && this.videoEncoder.state === 'configured') {
          const keyFrame = this.videoFrameCount % 60 === 0;
          this.videoEncoder.encode(frame, { keyFrame });
          this.videoFrameCount++;
        }
        frame.close();
      }
    };

    encodeLoop();
  }

  private async setupAudioEncoder(track: MediaStreamTrack) {
    this.audioEncoder = new AudioEncoder({
      output: (chunk: any, metadata: any) => this.handleEncodedChunk(chunk, metadata, MediaType.AUDIO),
      error: (e: any) => console.error("AudioEncoder error", e),
    });

    // Opus is widely supported and great for calls
    this.audioEncoder.configure({
      codec: 'opus',
      sampleRate: 48000,
      numberOfChannels: 2,
      bitrate: 64000,
    });

    const processor = new (window as any).MediaStreamTrackProcessor({ track });
    const reader = processor.readable.getReader();

    const encodeLoop = async () => {
      while (true) {
        const { done, value: data } = await reader.read();
        if (done) break;
        if (this.audioEncoder && this.audioEncoder.state === 'configured') {
          this.audioEncoder.encode(data);
        }
        data.close();
      }
    };

    encodeLoop();
  }

  async replaceVideoTrack(track: MediaStreamTrack) {
    console.log("Replacing video track in engine...");
    if (this.videoEncoder) {
      try { this.videoEncoder.close(); } catch (e) {}
      this.videoEncoder = null;
    }
    await this.setupVideoEncoder(track);
  }

  async replaceAudioTrack(track: MediaStreamTrack) {
    console.log("Replacing audio track in engine...");
    if (this.audioEncoder) {
      try { this.audioEncoder.close(); } catch (e) {}
      this.audioEncoder = null;
    }
    await this.setupAudioEncoder(track);
  }

  private handleEncodedChunk(chunk: any, metadata: any, type: MediaType) {
    if (this.ws.readyState !== WebSocket.OPEN) return;

    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);

    const packet = MediaPacketSerializer.encode({
      mediaType: type,
      senderId: this.localUserId,
      data: data,
      frameType: chunk.type || 'delta',
      timestamp: chunk.timestamp,
    });

    this.ws.send(packet);
  }

  handleIncomingData(data: ArrayBuffer) {
    const packet = MediaPacketSerializer.decode(new Uint8Array(data));
    
    if (packet.mediaType === MediaType.VIDEO) {
      this.decodeVideo(packet);
    } else if (packet.mediaType === MediaType.AUDIO) {
      this.decodeAudio(packet);
    }
  }

  private decodeVideo(packet: MediaPacket) {
    let decoder = this.videoDecoders.get(packet.senderId);
    if (!decoder) {
      decoder = new VideoDecoder({
        output: (frame: any) => this.onRemoteFrame(packet.senderId, MediaType.VIDEO, frame),
        error: (e: any) => console.error("VideoDecoder error", e),
      });
      decoder.configure({
        codec: 'avc1.42E01E',
      });
      this.videoDecoders.set(packet.senderId, decoder);
    }

    if (decoder.state === 'configured') {
      const chunk = new EncodedVideoChunk({
        type: (packet.frameType as any) === 'key' ? 'key' : 'delta',
        timestamp: packet.timestamp,
        data: packet.data,
      });
      decoder.decode(chunk);
    }
  }

  private decodeAudio(packet: MediaPacket) {
    let decoder = this.audioDecoders.get(packet.senderId);
    if (!decoder) {
      decoder = new AudioDecoder({
        output: (data: any) => this.onRemoteFrame(packet.senderId, MediaType.AUDIO, data),
        error: (e: any) => console.error("AudioDecoder error", e),
      });
      decoder.configure({
        codec: 'opus',
        sampleRate: 48000,
        numberOfChannels: 2,
      });
      this.audioDecoders.set(packet.senderId, decoder);
    }

    if (decoder.state === 'configured') {
      const chunk = new EncodedAudioChunk({
        type: 'key', // Opus chunks are always independent
        timestamp: packet.timestamp,
        data: packet.data,
      });
      decoder.decode(chunk);
    }
  }

  destroy() {
    this.videoEncoder?.close();
    this.audioEncoder?.close();
    this.videoDecoders.forEach(d => d.close());
    this.audioDecoders.forEach(d => d.close());
  }
}
