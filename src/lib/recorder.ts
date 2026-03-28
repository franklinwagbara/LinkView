import { RECORDING_TIMESLICE_MS } from "./constants";
import { getSupportedMimeType } from "./media";
import type { RecordingState } from "@/types";

type RecordingCallback = (state: RecordingState, size: number) => void;

/**
 * Stream recorder using MediaRecorder API.
 * Records the remote or local stream and provides a downloadable blob.
 */
export class StreamRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mimeType: string;
  private startTime = 0;
  private _state: RecordingState = "idle";
  private onStateChange: RecordingCallback | null = null;

  constructor() {
    this.mimeType = getSupportedMimeType();
  }

  get state(): RecordingState {
    return this._state;
  }

  get duration(): number {
    if (this.startTime === 0) return 0;
    return (Date.now() - this.startTime) / 1000;
  }

  get size(): number {
    return this.chunks.reduce((acc, chunk) => acc + chunk.size, 0);
  }

  setStateCallback(cb: RecordingCallback): void {
    this.onStateChange = cb;
  }

  start(stream: MediaStream): void {
    if (this._state === "recording") return;

    this.chunks = [];
    this.recorder = new MediaRecorder(stream, {
      mimeType: this.mimeType,
      videoBitsPerSecond: 2500000,
    });

    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
        this.onStateChange?.("recording", this.size);
      }
    };

    this.recorder.onstop = () => {
      this.setState("stopped");
    };

    this.recorder.onerror = () => {
      this.setState("stopped");
    };

    this.recorder.start(RECORDING_TIMESLICE_MS);
    this.startTime = Date.now();
    this.setState("recording");
  }

  pause(): void {
    if (this.recorder?.state === "recording") {
      this.recorder.pause();
      this.setState("paused");
    }
  }

  resume(): void {
    if (this.recorder?.state === "paused") {
      this.recorder.resume();
      this.setState("recording");
    }
  }

  stop(): void {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.stop();
    }
  }

  download(filename: string = "linkview-recording"): void {
    if (this.chunks.length === 0) return;

    const blob = new Blob(this.chunks, { type: this.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 19)}.webm`;
    a.click();

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  getBlob(): Blob | null {
    if (this.chunks.length === 0) return null;
    return new Blob(this.chunks, { type: this.mimeType });
  }

  reset(): void {
    this.stop();
    this.chunks = [];
    this.startTime = 0;
    this.setState("idle");
  }

  private setState(state: RecordingState): void {
    this._state = state;
    this.onStateChange?.(state, this.size);
  }
}
