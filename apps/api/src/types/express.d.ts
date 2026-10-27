import type { AuthContext } from '../auth/session.service';

export {};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startedAt?: bigint;
      auth?: AuthContext;
      rawBody?: Buffer;
    }
  }
}
