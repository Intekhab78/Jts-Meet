import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

export interface UseSpeakingDetectorProps {
  localStream: MediaStream | null;
  isMuted: boolean;
  meetingId: string;
  socketRef: React.RefObject<Socket | null>;
}

export function useSpeakingDetector({
  localStream,
  isMuted,
  meetingId,
  socketRef,
}: UseSpeakingDetectorProps) {
  const [speakingUsers, setSpeakingUsers] = useState<Record<string, boolean>>({});
  const [showMutedSpeakingToast, setShowMutedSpeakingToast] = useState(false);
  const mutedToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!localStream) return;

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let clonedTrack: MediaStreamTrack | null = null;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length === 0) return;

      audioCtx = new AudioCtx();
      clonedTrack = audioTracks[0].clone();
      const rawTrackStream = new MediaStream([clonedTrack]);
      const source = audioCtx.createMediaStreamSource(rawTrackStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let speakingFrames = 0;
      let quietFrames = 0;

      const checkVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;

        if (isMuted) {
          if (avg > 24) {
            speakingFrames++;
            if (speakingFrames > 2) {
              setShowMutedSpeakingToast(true);
              if (mutedToastTimeoutRef.current) clearTimeout(mutedToastTimeoutRef.current);
              mutedToastTimeoutRef.current = setTimeout(() => {
                setShowMutedSpeakingToast(false);
              }, 3200);
              speakingFrames = 0;
            }
          } else {
            speakingFrames = Math.max(0, speakingFrames - 1);
          }
          setSpeakingUsers((prev) => (prev['local'] ? { ...prev, local: false } : prev));
        } else {
          if (avg > 18) {
            quietFrames = 0;
            setSpeakingUsers((prev) => {
              if (!prev['local']) {
                socketRef.current?.emit('meeting:speaking', { meetingId, isSpeaking: true });
                return { ...prev, local: true };
              }
              return prev;
            });
          } else {
            quietFrames++;
            if (quietFrames > 4) {
              setSpeakingUsers((prev) => {
                if (prev['local']) {
                  socketRef.current?.emit('meeting:speaking', { meetingId, isSpeaking: false });
                  return { ...prev, local: false };
                }
                return prev;
              });
            }
          }
        }
      };

      pollTimer = setInterval(checkVolume, 100);
    } catch (_) {}

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      try { clonedTrack?.stop(); } catch (_) {}
      if (audioCtx) audioCtx.close().catch(() => {});
    };
  }, [localStream, isMuted, meetingId, socketRef]);

  return {
    speakingUsers,
    setSpeakingUsers,
    showMutedSpeakingToast,
    setShowMutedSpeakingToast,
  };
}
