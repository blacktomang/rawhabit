import { useEffect, useRef, useState } from "react";
import type { Visibility } from "@rawhabit/shared";

const MAX_MEDIA_BYTES = 15 * 1024 * 1024;
type RecordingMode = "video" | "audio";
type CaptureState = "idle" | "permission" | "recording" | "preview" | "submitting" | "error";

interface Props {
  onSubmit: (audio: Blob | null, video: Blob | null, transcript: string, visibility: Visibility) => Promise<void>;
  processingStage: string;
}

export function Recorder({ onSubmit, processingStage }: Props) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recorders, setRecorders] = useState<MediaRecorder[]>([]);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [mode, setMode] = useState<RecordingMode>("video");
  const [seconds, setSeconds] = useState(0);
  const [demoTranscript, setDemoTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [recorderError, setRecorderError] = useState("");
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const timer = useRef<number | null>(null);
  const liveVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => { if (liveVideo.current) liveVideo.current.srcObject = stream; }, [stream]);
  useEffect(() => {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoBlob]);
  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
    stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);

  const stop = () => recorders.forEach((recorder) => { if (recorder.state === "recording") recorder.stop(); });
  const mime = (types: string[]) => types.find((type) => MediaRecorder.isTypeSupported(type));
  const clearRecording = () => { setVideoBlob(null); setAudioBlob(null); setPreviewUrl(""); setSeconds(0); setRecorderError(""); setCaptureState("idle"); };

  const record = async () => {
    clearRecording();
    setCaptureState("permission");
    let nextStream: MediaStream;
    let nextMode: RecordingMode = "video";
    try {
      nextStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      try {
        nextStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        nextMode = "audio";
      } catch {
        setCaptureState("error"); setRecorderError("Camera or microphone access is unavailable. You can still use the demo recording note below.");
        return;
      }
    }

    const audioChunks: BlobPart[] = [];
    const videoChunks: BlobPart[] = [];
    const audioType = mime(["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]);
    const videoType = mime(["video/webm;codecs=vp8,opus", "video/webm"]);
    const audioRecorder = new MediaRecorder(new MediaStream(nextStream.getAudioTracks()), audioType ? { mimeType: audioType } : undefined);
    const videoRecorder = nextMode === "video" ? new MediaRecorder(nextStream, videoType ? { mimeType: videoType } : undefined) : null;
    const expectedStops = videoRecorder ? 2 : 1;
    let stopped = 0;
    let completedAudio: Blob | null = null;
    let completedVideo: Blob | null = null;
    const finish = () => {
      stopped += 1;
      if (stopped !== expectedStops) return;
      const mediaSize = (completedAudio?.size ?? 0) + (completedVideo?.size ?? 0);
      nextStream.getTracks().forEach((track) => track.stop());
      setStream(null); setRecorders([]);
      if (timer.current) window.clearInterval(timer.current);
      if (mediaSize > MAX_MEDIA_BYTES) {
        clearRecording();
        setCaptureState("error"); setRecorderError("This recording is larger than 15 MB. Please make a shorter check-in and try again.");
        return;
      }
      setCaptureState("preview"); setAudioBlob(completedAudio);
      setVideoBlob(completedVideo);
    };

    audioRecorder.ondataavailable = (event) => audioChunks.push(event.data);
    audioRecorder.onstop = () => { completedAudio = new Blob(audioChunks, { type: audioRecorder.mimeType }); finish(); };
    if (videoRecorder) {
      videoRecorder.ondataavailable = (event) => videoChunks.push(event.data);
      videoRecorder.onstop = () => { completedVideo = new Blob(videoChunks, { type: videoRecorder.mimeType }); finish(); };
    }
    setCaptureState("recording"); setMode(nextMode); setStream(nextStream); setRecorders(videoRecorder ? [videoRecorder, audioRecorder] : [audioRecorder]); setSeconds(0);
    audioRecorder.start(); videoRecorder?.start();
    timer.current = window.setInterval(() => setSeconds((value) => {
      if (value >= 29) { audioRecorder.stop(); videoRecorder?.stop(); return 30; }
      return value + 1;
    }), 1000);
  };

  const send = async () => {
    setBusy(true); setCaptureState("submitting");
    await onSubmit(audioBlob, videoBlob, demoTranscript, "private");
    setBusy(false); setCaptureState(hasRecording ? "preview" : "idle");
  };
  const isRecording = Boolean(stream);
  const hasRecording = Boolean(audioBlob);

  return <section className="card recorder"><p className="eyebrow">Daily raw log</p><h2>Record the real moment.</h2>{captureState === "permission" && <p className="processing-stage">Requesting camera and microphone permission…</p>}{isRecording && mode === "video" && <div className="camera-frame live"><video ref={liveVideo} autoPlay muted playsInline /><span>● Live camera</span></div>}{isRecording && mode === "audio" && <p className="audio-only-state">● Audio-only recording — camera access was declined.</p>}{previewUrl && !isRecording && <div className="camera-frame"><video src={previewUrl} controls playsInline /><span>Video will be saved · audio-only sent to coach</span></div>}{!isRecording && !hasRecording && <button onClick={() => void record()} disabled={captureState === "permission"}>Record today’s raw log</button>}{isRecording && <><p className="recording">● Recording {seconds}s / 30s</p><button className="secondary" onClick={stop} disabled={seconds < 15}>Stop recording</button>{seconds < 15 && <small>Keep going for {15 - seconds} seconds.</small>}</>}{hasRecording && <><p className="success">{mode === "audio" ? "Audio check-in is ready for your coach." : "Video and audio are ready. Your video will be saved; only audio goes to transcription."}</p><button className="secondary" onClick={clearRecording}>Retake recording</button></>}{recorderError && <p className="alert">{recorderError}</p>}<p className="private-note">This check-in stays private until you review and publish its progress card.</p>{processingStage && <p className="processing-stage">{processingStage}</p>}<label>Demo transcript / recording note<textarea value={demoTranscript} onChange={(event) => setDemoTranscript(event.target.value)} placeholder="Optional: use only when you need the demo fallback." /></label><button onClick={() => void send()} disabled={busy || Boolean(processingStage) || (!audioBlob && !demoTranscript)}>{busy || processingStage ? "Coaching…" : "Save check-in & get coaching"}</button></section>;
}
