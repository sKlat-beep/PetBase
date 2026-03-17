import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Send, X } from 'lucide-react';
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
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
      // Microphone not available or denied
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
      // Upload failed
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

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
      {!audioBlob ? (
        <>
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`p-2 rounded-full transition-colors ${
              recording
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
            aria-label={recording ? 'Stop recording' : 'Start recording'}
          >
            {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <span className="text-sm text-neutral-600 dark:text-neutral-300 tabular-nums min-w-[3rem]">
            {recording ? formatTime(duration) : 'Tap to record'}
          </span>
          {!recording && (
            <button onClick={onClose} className="ml-auto p-1 text-neutral-400 hover:text-neutral-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </>
      ) : (
        <>
          <audio src={audioUrl!} controls className="h-8 flex-1" />
          <span className="text-xs text-neutral-400">{formatTime(duration)}</span>
          <button
            onClick={handleDiscard}
            className="p-1.5 text-neutral-400 hover:text-rose-500 transition-colors"
            aria-label="Discard recording"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={handleSend}
            disabled={uploading}
            className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            aria-label="Send voice message"
          >
            <Send className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
