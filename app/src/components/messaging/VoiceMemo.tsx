import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadMessageAudio } from '../../lib/storageService';

interface VoiceMemoProps {
  onSend: (audioUrl: string) => void;
  onClose: () => void;
  senderUid: string;
  recipientUid: string;
}

export function VoiceMemo({ onSend, onClose, senderUid, recipientUid }: VoiceMemoProps) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

      // Auto-stop at 60 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 60_000);
    } catch {
      setError('Microphone access denied. Please allow mic access and try again.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!audioBlob) return;
    setUploading(true);
    try {
      const url = await uploadMessageAudio(senderUid, recipientUid, audioBlob);
      onSend(url);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [audioBlob, senderUid, recipientUid, onSend]);

  const handleDiscard = useCallback(() => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDuration(0);
    onClose();
  }, [audioUrl, onClose]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 p-2 bg-surface-container-low rounded-xl border border-outline-variant">
      {!audioBlob ? (
        <>
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`p-2 rounded-full transition-colors ${
              recording
                ? 'bg-error text-on-error animate-pulse'
                : 'bg-primary text-on-primary hover:bg-primary/90'
            }`}
            aria-label={recording ? 'Stop recording' : 'Start recording'}
          >
            {recording
              ? <span className="material-symbols-outlined text-[16px]">stop</span>
              : <span className="material-symbols-outlined text-[16px]">mic</span>}
          </button>
          <span className="text-sm text-on-surface-variant tabular-nums min-w-[3rem]">
            {recording ? formatTime(duration) : 'Tap to record'}
          </span>
          {!recording && (
            <button onClick={onClose} className="ml-auto p-1 text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </>
      ) : (
        <>
          <audio src={audioUrl!} controls className="h-8 flex-1" />
          <span className="text-xs text-on-surface-variant">{formatTime(duration)}</span>
          <button
            onClick={handleDiscard}
            className="p-1.5 text-on-surface-variant hover:text-error transition-colors"
            aria-label="Discard recording"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
          <button
            onClick={handleSend}
            disabled={uploading}
            className="p-2 bg-primary text-on-primary rounded-full hover:bg-primary/90 disabled:opacity-50 transition-colors"
            aria-label="Send voice message"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="text-xs text-error mt-1 px-2">
          {error}
        </p>
      )}
    </div>
  );
}
