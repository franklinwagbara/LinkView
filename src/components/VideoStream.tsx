"use client";

import React, { useRef, useEffect, memo } from "react";
import { cn } from "@/lib/utils";

interface VideoStreamProps {
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  label?: string;
  className?: string;
  objectFit?: "contain" | "cover";
  showPlaceholder?: boolean;
}

/**
 * Optimized video element that avoids unnecessary React re-renders.
 * Uses ref-based srcObject assignment for performance.
 */
export const VideoStream = memo(function VideoStream({
  stream,
  muted = false,
  mirrored = false,
  label,
  className,
  objectFit = "contain",
  showPlaceholder = true,
}: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.play().catch(() => {
        // Autoplay may be blocked; user interaction may be needed
      });
    } else {
      video.srcObject = null;
    }

    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  if (!stream && showPlaceholder) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center bg-slate-900 rounded-xl overflow-hidden",
          className,
        )}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a9 9 0 01-18 0V5.25"
              />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">
            {label || "Waiting for stream..."}
          </p>
        </div>

        {label && (
          <div className="absolute bottom-3 left-3">
            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
              {label}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("relative bg-black rounded-xl overflow-hidden", className)}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={cn(
          "w-full h-full",
          objectFit === "contain" ? "object-contain" : "object-cover",
          mirrored && "scale-x-[-1]",
        )}
      />

      {label && (
        <div className="absolute bottom-3 left-3">
          <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
            {label}
          </span>
        </div>
      )}
    </div>
  );
});
