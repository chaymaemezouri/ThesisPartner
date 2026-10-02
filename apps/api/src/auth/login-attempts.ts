import { Injectable } from '@nestjs/common';
import { AppException } from '../common/errors/app.exception';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

type Bucket = { count: number; resetAt: number };

@Injectable()
export class LoginAttemptTracker {
  private readonly failures = new Map<string, Bucket>();

  assertAllowed(email: string, now = Date.now()): void {
    const bucket = this.current(email, now);
    if (bucket && bucket.count >= MAX_FAILURES) {
      throw new AppException(429, 'RATE_LIMITED', 'Too many attempts');
    }
  }

  recordFailure(email: string, now = Date.now()): void {
    const bucket = this.current(email, now);
    if (!bucket) {
      this.failures.set(email, { count: 1, resetAt: now + WINDOW_MS });
      return;
    }
    bucket.count += 1;
  }

  clear(email: string): void {
    this.failures.delete(email);
  }

  private current(email: string, now: number): Bucket | undefined {
    const bucket = this.failures.get(email);
    if (!bucket) return undefined;
    if (bucket.resetAt <= now) {
      this.failures.delete(email);
      return undefined;
    }
    return bucket;
  }
}
