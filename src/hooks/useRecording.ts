"use client";

import { useRef, useCallback } from "react";
import { StreamRecorder } from "@/lib/recorder";
import { useUIStore } from "@/stores/ui-store";

/**
 * Hook for recording the remote or local stream.
 */
export function useRecording() {
  const recorderRef = useRef(new StreamRecorder());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setRecordingState = useUIStore((s) => s.setRecordingState);
  const setRecordingInfo = useUIStore((s) => s.setRecordingInfo);

  const startRecording = useCallback(
    (stream: MediaStream) => {
      const recorder = recorderRef.current;

      recorder.setStateCallback((state, size) => {
        setRecordingState(state);
        setRecordingInfo(recorder.duration, size);
      });

      recorder.start(stream);

      // Update duration periodically
      timerRef.current = setInterval(() => {
        setRecordingInfo(recorder.duration, recorder.size);
      }, 500);
    },
    [setRecordingState, setRecordingInfo],
  );

  const stopRecording = useCallback(() => {
    recorderRef.current.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pauseRecording = useCallback(() => {
    recorderRef.current.pause();
  }, []);

  const resumeRecording = useCallback(() => {
    recorderRef.current.resume();
  }, []);

  const downloadRecording = useCallback((filename?: string) => {
    recorderRef.current.download(filename);
  }, []);

  const resetRecording = useCallback(() => {
    recorderRef.current.reset();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    downloadRecording,
    resetRecording,
  };
}
