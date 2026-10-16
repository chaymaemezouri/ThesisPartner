import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ENV, type Env } from '../config/env';
import { StructuredLogger } from '../infrastructure/logger/logger';
import { MeetingNotice } from './meeting-notice';

const REMINDER_INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class MeetingReminder implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly notice: MeetingNotice,
    private readonly logger: StructuredLogger,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onModuleInit(): void {
    if (this.env.NODE_ENV === 'test') return;
    void this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, REMINDER_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    try {
      await this.notice.remindDue();
    } catch {
      this.logger.write({ level: 'error', msg: 'meeting.reminder.failed' });
    }
  }
}
