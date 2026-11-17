import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n/LocaleContext';
import { formatVoiceClock, VoiceNotePlayer, VoiceWaveform } from './VoiceNotePlayer';

export function VoiceRecorder({
  disabled,
  onChange,
}: {
  disabled?: boolean;
  onChange: (value: { file: File; durationMs: number } | null) => void;
}) {
  const t = useT();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number>(undefined);
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [preview, setPreview] = useState<{ file: File; durationMs: number } | null>(null);
  const [hint, setHint] = useState<'unsupported' | 'permission' | null>(null);
  const previewUrl = useMemo(() => (preview ? URL.createObjectURL(preview.file) : null), [preview]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      recorder?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function start() {
    setHint(null);
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setHint('unsupported');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickVoiceMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setRecordMs(0);
      setRecording(true);
      setPreview(null);
      onChange(null);
      recorder.start();
      timerRef.current = window.setInterval(() => {
        setRecordMs(Date.now() - startedAtRef.current);
      }, 180);
    } catch {
      setHint('permission');
    }
  }

  async function stop(keep: boolean) {
    const recorder = recorderRef.current;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = undefined;
    setRecording(false);
    const duration = Date.now() - startedAtRef.current;
    if (!recorder) return;
    const blob = await new Promise<Blob>((resolve) => {
      const finish = () => {
        recorder.stream.getTracks().forEach((track) => track.stop());
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorder.addEventListener('stop', finish, { once: true });
      if (recorder.state === 'inactive') {
        finish();
        return;
      }
      recorder.stop();
    });
    recorderRef.current = null;
    chunksRef.current = [];
    if (!keep || blob.size < 200) {
      setPreview(null);
      onChange(null);
      return;
    }
    const type = (blob.type.split(';')[0] || 'audio/webm').trim();
    const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm';
    const file = new File([blob], `voice.${ext}`, { type });
    const next = { file, durationMs: duration };
    setPreview(next);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {hint === 'unsupported' ? (
        <p className="text-xs text-danger" role="alert">
          {t('remarks.voiceUnsupported')}
        </p>
      ) : null}
      {hint === 'permission' ? (
        <p className="text-xs text-danger" role="alert">
          {t('remarks.voicePermission')}
        </p>
      ) : null}
      {recording ? (
        <div className="flex items-center gap-2 rounded-full bg-[#16171d] px-2 py-1.5 text-white shadow-[0_8px_24px_rgb(20_20_30_/_0.18)]">
          <button
            type="button"
            aria-label={t('remarks.cancelRecording')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => void stop(false)}
          >
            <TrashGlyph />
          </button>
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#ff3b5c]" />
          <VoiceWaveform live className="text-[#ff5d79]" />
          <span className="w-10 shrink-0 text-right text-[11px] font-medium tabular-nums text-white/80">
            {formatVoiceClock(recordMs)}
          </span>
          <button
            type="button"
            aria-label={t('remarks.stopRecording')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ff3b5c] text-white"
            onClick={() => void stop(true)}
          >
            <StopGlyph />
          </button>
        </div>
      ) : preview && previewUrl ? (
        <div className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[#7a5cf4] via-[#6a57ea] to-[#4f74ea] px-2 py-1.5">
          <VoiceNotePlayer
            src={previewUrl}
            durationMs={preview.durationMs}
            tone="own"
            label={t('remarks.voice')}
            playLabel={t('remarks.playVoice')}
            pauseLabel={t('remarks.pauseVoice')}
          />
          <button
            type="button"
            aria-label={t('remarks.removeVoice')}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/80 hover:bg-white/15 hover:text-white"
            onClick={() => {
              setPreview(null);
              onChange(null);
            }}
          >
            <TrashGlyph />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={disabled}
            aria-label={t('remarks.recordVoice')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#7a5cf4] to-[#4f74ea] text-white shadow-[0_6px_16px_rgb(79_116_234_/_0.35)] disabled:opacity-40"
            onClick={() => void start()}
          >
            <MicGlyph />
          </button>
          <p className="text-xs leading-snug text-muted">{t('remarks.voiceHelp')}</p>
        </div>
      )}
    </div>
  );
}

function pickVoiceMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  for (const type of [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
}

function MicGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3.5M9.5 20.5h5" strokeLinecap="round" />
    </svg>
  );
}

function StopGlyph() {
  return <span className="block h-3 w-3 rounded-[3px] bg-white" />;
}

function TrashGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M5 7h14M9 7V5h6v2M8 7l.7 12h6.6L16 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
