export type AudioraEventType =
  | "start"
  | "stop"
  | "noteplay"
  | "imageload"
  | "error";

export interface AudioraStartEvent extends CustomEvent<{ timestamp: number }> {
  readonly type: "start";
}

export interface AudioraStopEvent
  extends CustomEvent<{ timestamp: number; duration: number }> {
  readonly type: "stop";
}

export interface AudioraNotePlayEvent
  extends CustomEvent<{
    freq: number;
    vel: number;
    pan: number;
    blockIndex: number;
    timestamp: number;
  }> {
  readonly type: "noteplay";
}

export interface AudioraImageLoadEvent
  extends CustomEvent<{
    width: number;
    height: number;
    blockCount: number;
  }> {
  readonly type: "imageload";
}

export interface AudioraErrorEvent
  extends CustomEvent<{ error: Error; context: string }> {
  readonly type: "error";
}

export interface AudioraEventMap {
  start: AudioraStartEvent;
  stop: AudioraStopEvent;
  noteplay: AudioraNotePlayEvent;
  imageload: AudioraImageLoadEvent;
  error: AudioraErrorEvent;
}

export type AudioraEvent = AudioraEventMap[AudioraEventType];
