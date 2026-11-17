import { useEffect, useMemo, useRef, useState } from 'react';

const BAR_COUNT = 28;

export function VoiceNotePlayer({
  src,
  durationMs,
  label,
  playLabel,
  pauseLabel,
  tone = 'peer',
}: {
  src: string;
  durationMs?: number | null;
  label: string;
  playLabel: string;
  pauseLabel: string;
  tone?: 'own' | 'peer';
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [knownDuration, setKnownDuration] = useState(durationMs ?? 0);
  const heights = useMemo(() => waveformFromSeed(src), [src]);

  useEffect(() => {
    setKnownDuration(durationMs ?? 0);
    setProgress(0);
    setElapsed(0);
    setPlaying(false);
  }, [src, durationMs]);

  function sync() {
    const audio = audioRef.current;
    if (!audio) return;
    const total =
      Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : knownDuration;
    if (total > 0 && total !== knownDuration) setKnownDuration(total);
    const current = audio.currentTime * 1000;
    setElapsed(current);
    setProgress(total > 0 ? Math.min(1, current / total) : 0);
  }

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  function seek(ratio: number) {
    const audio = audioRef.current;
    const total =
      knownDuration || (audio && Number.isFinite(audio.duration) ? audio.duration * 1000 : 0);
    if (!audio || total <= 0) return;
    audio.currentTime = (Math.min(1, Math.max(0, ratio)) * total) / 1000;
    sync();
  }

  const shown = playing || elapsed > 0 ? elapsed : knownDuration;
  const own = tone === 'own';

  return (
    <div
      className={`flex w-full max-w-[240px] items-center gap-2.5 ${own ? 'text-white' : 'text-brand'}`}
      role="group"
      aria-label={label}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={sync}
        onLoadedMetadata={sync}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setElapsed(0);
        }}
        onPause={() => setPlaying(false)}
      />
      <button
        type="button"
        aria-label={playing ? pauseLabel : playLabel}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full shadow-[0_1px_4px_rgb(20_20_30_/_0.12)] ${
          own ? 'bg-white text-[#6b56ea]' : 'bg-brand text-white'
        }`}
        onClick={() => void toggle()}
      >
        {playing ? <PauseGlyph /> : <PlayGlyph />}
      </button>
      <VoiceWaveform
        heights={heights}
        progress={progress}
        onSeek={seek}
        className={own ? 'text-white' : 'text-brand'}
      />
      <span
        className={`w-9 shrink-0 text-right font-medium tabular-nums ${own ? 'text-white/90' : 'text-muted'} text-[11px]`}
      >
        {formatVoiceClock(shown)}
      </span>
    </div>
  );
}

export function VoiceWaveform({
  heights,
  progress = 0,
  live = false,
  onSeek,
  className = '',
}: {
  heights?: number[];
  progress?: number;
  live?: boolean;
  onSeek?: (ratio: number) => void;
  className?: string;
}) {
  const bars = heights ?? DEFAULT_BARS;
  return (
    <div
      className={`flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-[2.5px] ${className}`}
      role={onSeek ? 'slider' : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      aria-valuenow={onSeek ? Math.round(progress * 100) : undefined}
      tabIndex={onSeek ? 0 : undefined}
      onClick={
        onSeek
          ? (event) => {
              const box = event.currentTarget.getBoundingClientRect();
              onSeek((event.clientX - box.left) / box.width);
            }
          : undefined
      }
      onKeyDown={
        onSeek
          ? (event) => {
              if (event.key === 'ArrowRight') onSeek(Math.min(1, progress + 0.05));
              if (event.key === 'ArrowLeft') onSeek(Math.max(0, progress - 0.05));
            }
          : undefined
      }
    >
      {bars.map((height, index) => {
        const filled = live || index / bars.length <= progress;
        return (
          <span
            key={index}
            className={`voice-bar w-[2.5px] rounded-full ${live ? 'voice-bar--live' : ''} ${
              filled ? 'opacity-100' : 'opacity-30'
            }`}
            style={{
              height: `${10 + height * 18}px`,
              background: 'currentColor',
              animationDelay: live ? `${(index % 8) * 70}ms` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

export function formatVoiceClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function waveformFromSeed(seed: string): number[] {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Array.from({ length: BAR_COUNT }, (_, index) => {
    hash = Math.imul(hash ^ (index + 1), 16777619);
    const unit = ((hash >>> 0) % 1000) / 1000;
    return 0.22 + unit * 0.78;
  });
}

const DEFAULT_BARS = waveformFromSeed('voice');

function PlayGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 translate-x-px"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5.2v13.6c0 .7.8 1.1 1.4.7l10-6.8c.6-.4.6-1.3 0-1.7l-10-6.8C8.8 4.1 8 4.5 8 5.2Z" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}
