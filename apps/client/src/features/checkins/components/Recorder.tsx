import { useEffect, useRef, useState } from "react";
import type { Visibility } from "@rawhabit/shared";

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
  const [seconds, setSeconds] = useState(0);
  const [demoTranscript, setDemoTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);
  const liveVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => { if (liveVideo.current) liveVideo.current.srcObject = stream; }, [stream]);
  useEffect(() => { if (!videoBlob) return; const url = URL.createObjectURL(videoBlob); setPreviewUrl(url); return () => URL.revokeObjectURL(url); }, [videoBlob]);

  const stop = () => recorders.forEach((recorder) => { if (recorder.state === "recording") recorder.stop(); });
  const mime = (types: string[]) => types.find((type) => MediaRecorder.isTypeSupported(type));
  const record = async () => {
    const nextStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const videoChunks: BlobPart[] = [];
    const audioChunks: BlobPart[] = [];
    let stopped = 0;
    const finish = () => { stopped += 1; if (stopped !== 2) return; nextStream.getTracks().forEach((track) => track.stop()); setStream(null); setRecorders([]); if (timer.current) window.clearInterval(timer.current); };
    const videoType = mime(["video/webm;codecs=vp8,opus", "video/webm"]);
    const audioType = mime(["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]);
    const videoRecorder = new MediaRecorder(nextStream, videoType ? { mimeType: videoType } : undefined);
    const audioRecorder = new MediaRecorder(new MediaStream(nextStream.getAudioTracks()), audioType ? { mimeType: audioType } : undefined);
    videoRecorder.ondataavailable = (event) => videoChunks.push(event.data);
    audioRecorder.ondataavailable = (event) => audioChunks.push(event.data);
    videoRecorder.onstop = () => { setVideoBlob(new Blob(videoChunks, { type: videoRecorder.mimeType })); finish(); };
    audioRecorder.onstop = () => { setAudioBlob(new Blob(audioChunks, { type: audioRecorder.mimeType })); finish(); };
    setVideoBlob(null); setAudioBlob(null); setPreviewUrl(""); setStream(nextStream); setRecorders([videoRecorder, audioRecorder]); setSeconds(0); videoRecorder.start(); audioRecorder.start();
    timer.current = window.setInterval(() => setSeconds((value) => { if (value >= 29) { videoRecorder.stop(); audioRecorder.stop(); return 30; } return value + 1; }), 1000);
  };
  const send = async () => { setBusy(true); await onSubmit(audioBlob, videoBlob, demoTranscript, "private"); setBusy(false); };

  return <section className="card recorder"><p className="eyebrow">Daily raw log</p><h2>Record the real moment.</h2>{stream && <div className="camera-frame live"><video ref={liveVideo} autoPlay muted playsInline /><span>● Live camera</span></div>}{previewUrl && !stream && <div className="camera-frame"><video src={previewUrl} controls playsInline /><span>Video will be saved · audio-only sent to coach</span></div>}{!stream && !videoBlob && <button onClick={() => record().catch(() => setDemoTranscript("I had a difficult moment today, but I chose to pause and check in."))}>Record today’s raw log</button>}{stream && <><p className="recording">● Recording {seconds}s / 30s</p><button className="secondary" onClick={stop} disabled={seconds < 15}>Stop recording</button>{seconds < 15 && <small>Keep going for {15 - seconds} seconds.</small>}</>}{audioBlob && <p className="success">Video and audio are ready. Your video will be saved; only audio goes to transcription.</p>}<p className="private-note">This check-in stays private until you review and publish its progress card.</p>{processingStage && <p className="processing-stage">{processingStage}</p>}<label>Demo transcript / recording note<textarea value={demoTranscript} onChange={(event) => setDemoTranscript(event.target.value)} placeholder="Optional: use only when you need the demo fallback." /></label><button onClick={send} disabled={busy || Boolean(processingStage) || (!audioBlob && !demoTranscript)}>{busy || processingStage ? "Coaching…" : "Save check-in & get coaching"}</button></section>;
}
