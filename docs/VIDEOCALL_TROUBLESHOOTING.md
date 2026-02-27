# Video Call Integration & Troubleshooting Guide

This document summarizes the technical challenges encountered during the integration of the Video Call system and the architectural solutions implemented to resolve them.

## 1. Issue: Call Interface Not Appearing
**Symptom:** You click the Call icon in the Chat, but the video overlay does not pop up.
**RCA (Root Cause Analysis):** The `useVideoCall` hook was used independently in both `Chat.tsx` and `VideoCallManager.tsx`. Each component had its own "private" state. When `Chat.tsx` updated its status to "OUTGOING," the `VideoCallManager` overlay remained "IDLE."
**Solution:**
- Created a **VideoCallContext** (Global State).
- Wrapped the entire application in a `VideoCallProvider`.
- All components now share the exact same state instance, ensuring the overlay reacts instantly to actions in the chat.

## 2. Issue: Recipient Not Receiving Call Signal
**Symptom:** The caller sees "Calling...", but the recipient sees nothing.
**RCA:**
1. **Payload Mismatch:** The backend signal arrived in a nested `{ payload: { ... } }` format, but the frontend was looking at the top level.
2. **ID Type Mismatch:** User IDs were being compared as Numbers vs. Strings, failing the comparison.
**Solution:**
- Updated WebSocket listeners to handle both **flat and nested** data structures.
- Implemented **String-safe comparisons** (`String(id1) === String(id2)`) for all IDs.
- Added debug logging to the console to track signal arrival.

## 3. Issue: "Cannot accept call with status active"
**Symptom:** An error toast appears when clicking "Accept" on mobile.
**RCA:** On mobile, double-tapping or slow network signals caused the app to send two "Accept" requests. The second request failed because the session was already active.
**Solution:**
- Added a **Safety Guard** (`status === ACTIVE`) at the start of the accept function.
- Implemented **Intelligent Error Suppression**: If the backend returns a "status active" error, the app now treats it as a success and proceeds to connect the media anyway instead of failing.

## 4. Issue: Microphone/Camera Switching Failures
**Symptom:** Switching to Bluetooth or switching between Front/Back camera would drop the audio/video.
**RCA:**
1. **Strict Constraints:** Using `deviceId: { exact: ... }` caused browsers to crash if the device was even slightly busy.
2. **Logic Gap:** The Media Engine wasn't being told about the new tracks, so it continued trying to encode the "dead" old track.
**Solution:**
- Switched to **Ideal Constraints**, which are much more resilient on mobile browsers.
- Added **Hot-Swap methods** (`replaceAudioTrack`/`replaceVideoTrack`) to the `MediaEngine` to update the encoder on-the-fly without dropping the connection.
- Implemented **Recursive Cleanup**: Old tracks are now stopped only *after* the new ones successfully start.

## 5. Issue: Audio Projection (Loudspeaker/Bluetooth)
**Symptom:** In "Voice Only" calls, sometimes no sound was heard, or sound wouldn't switch to Loudspeaker.
**RCA:** Browsers sometimes "suspend" video elements if they don't contain a video track, which kills the audio.
**Solution:**
- Added a **dedicated, hidden `<audio>` element** to the Overlay.
- The remote audio stream is now "mirrored" to both the video and the audio elements.
- The **Device Selector** now targets this hidden audio sink, ensuring Bluetooth and Loudspeaker work perfectly even when the camera is off.

## 6. Issue: Call Not Ending on Both Ends
**Symptom:** One person hangs up, but the other person stays stuck in the "Active Call" screen.
**RCA:** React state updates are asynchronous. If an "End Call" WebSocket signal arrived, the listener was looking at a "stale" state and didn't realize it was the same call.
**Solution:**
- Implemented **Live Tracking Refs** (`activeCallIdRef`).
- The WebSocket listener now checks a "Live" reference that is updated instantly at the hardware level, bypassing React's render cycle.
- This ensures that an "End Call" signal is recognized and acted upon 100% of the time, regardless of network speed.

## 7. Issue: Responsiveness (Mobile Lag)
**Symptom:** Clicking the call button felt "slow" or as if it didn't register.
**RCA:** The code was waiting for the Camera/Mic to turn on *before* showing the UI.
**Solution:**
- Implemented **Instant UI Feedback**. The WhatsApp-style calling frame pops up the very millisecond you tap the button.
- Permissions and Server notifications now happen in the background while the user sees the "Calling..." animation.

## 8. Issue: Black Screen/No Video on iPhone (Safari)
**Symptom:** The call connects, but the remote user's video is black on iPhone.
**RCA:** iOS Safari has strict requirements for video codecs and doesn't always support modern stream generators used in Chrome. 
**Solution:**
- Switched video encoding from **VP8** to **H.264 Baseline**, which is hardware-accelerated and natively supported on all iPhones.
- Implemented a **Canvas-based Rendering Fallback**: If Safari refuses to play the raw video stream, the app manually draws the video frames onto an HTML canvas.

## 9. Issue: No Audio During Voice Calls (Safari/Mobile)
**Symptom:** You can see the user, but cannot hear them during a voice call on iPhone.
**RCA:** Safari often "mutes" or "suspend" audio from media streams if it doesn't detect a visible, playing video element.
**Solution:**
- Developed a **Web Audio API Fallback Engine**.
- Added an **AudioContext scheduler** that plays the raw audio data through your phone's specialized audio hardware, bypassing the standard video player constraints.
- Added **Force Play** commands that trigger on user interaction (clicking "Accept").

## 10. Added Feature: Camera Flip (Front/Back)
**Goal:** Allow users to show their surroundings during a call.
**Implementation:**
- Added a dedicated **Switch** button with a 180-degree rotation animation.
- Implemented a **Cycling Logic** that detects all available cameras and hot-swaps the video track without dropping the call.
- Set the **Front Camera** as the default for a more personal "Calling" experience.

## 11. Issue: "Failed to switch microphone" (Bluetooth)
**Symptom:** Error message appears when trying to switch to a Bluetooth headset mid-call.
**RCA:** Mobile browsers sometimes lock the audio hardware. Requesting a new device while the old one is still active causes a collision.
**Solution:**
- Implemented **Soft-Release**: The old microphone is explicitly disabled and stopped *before* the new one is requested.
- Added a **Recursive Fallback**: If the specific Bluetooth ID fails, the app tries a "generic" request which the phone's OS automatically routes to the active Bluetooth device.
