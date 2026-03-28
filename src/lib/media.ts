import { DEFAULT_DISPLAY_CONSTRAINTS } from "./constants";

/**
 * Media utilities for capturing display and managing streams.
 */

/** Request screen capture from the user */
export async function captureDisplay(
  constraints?: DisplayMediaStreamOptions,
): Promise<MediaStream> {
  const mergedConstraints = constraints || DEFAULT_DISPLAY_CONSTRAINTS;

  try {
    const stream =
      await navigator.mediaDevices.getDisplayMedia(mergedConstraints);
    return stream;
  } catch (err: any) {
    if (err.name === "NotAllowedError") {
      throw new Error("Screen sharing was denied by the user");
    }
    if (err.name === "NotFoundError") {
      throw new Error("No screen capture source found");
    }
    throw new Error(`Screen capture failed: ${err.message}`);
  }
}

/** Stop all tracks in a MediaStream */
export function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

/** Get the supported recording MIME type */
export function getSupportedMimeType(): string {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=h264,opus",
    "video/webm",
    "video/mp4",
  ];

  for (const type of types) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(type)
    ) {
      return type;
    }
  }

  return "video/webm";
}

/**
 * Apply resolution constraints to an existing video track.
 * Useful for adapting quality without renegotiation.
 */
export async function applyTrackConstraints(
  track: MediaStreamTrack,
  width: number,
  height: number,
  frameRate: number,
): Promise<void> {
  await track.applyConstraints({
    width: { ideal: width, max: width },
    height: { ideal: height, max: height },
    frameRate: { ideal: frameRate, max: frameRate },
  });
}
