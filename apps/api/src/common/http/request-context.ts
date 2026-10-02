import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '@thesispartner/types';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function resolveRequestId(incoming: string | undefined): string {
  if (incoming && REQUEST_ID_PATTERN.test(incoming)) return incoming;
  return randomUUID();
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = resolveRequestId(req.header(REQUEST_ID_HEADER));
  req.requestId = requestId;
  req.startedAt = process.hrtime.bigint();
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

export function durationMs(startedAt: bigint | undefined): number {
  if (startedAt === undefined) return 0;
  return Number(process.hrtime.bigint() - startedAt) / 1e6;
}

export function routeOf(req: Request): string {
  const raw = req.originalUrl.split('?')[0] ?? req.path;
  return raw.slice(0, 200);
}
