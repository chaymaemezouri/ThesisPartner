import type { LogLevel } from '../../config/env';
import { redact } from './redact';

export type LogEvent = {
  level: 'info' | 'warn' | 'error';
  msg: string;
  [key: string]: unknown;
};

export class StructuredLogger {
  constructor(
    private readonly level: LogLevel,
    private readonly sink: (line: string) => void = (line) => {
      process.stdout.write(line);
    },
  ) {}

  write(event: LogEvent): void {
    if (this.level === 'silent') return;
    if (this.level === 'error' && event.level !== 'error') return;
    if (this.level === 'warn' && event.level === 'info') return;

    const safe = redact(event);
    const line = JSON.stringify({
      time: new Date().toISOString(),
      ...(safe as Record<string, unknown>),
    });
    this.sink(`${line}\n`);
  }
}
