import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import multer, { diskStorage } from 'multer';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ENV, type Env } from '../config/env';

@Injectable()
export class SingleFileUploadInterceptor implements NestInterceptor {
  constructor(@Inject(ENV) private readonly env: Env) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    const maxBytes = this.env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
    const upload = multer({
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_req, _file, callback) => callback(null, `tp-${randomUUID()}`),
      }),
      limits: { fileSize: maxBytes, files: 1, fields: 2 },
    }).single('file');

    return new Observable((subscriber) => {
      upload(request, response, (error: unknown) => {
        if (error) {
          subscriber.error(mapUploadError(error, this.env.MAX_UPLOAD_SIZE_MB));
          return;
        }
        next.handle().subscribe(subscriber);
      });
    });
  }
}

function mapUploadError(error: unknown, maxMb: number): AppException {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return new AppException(
      413,
      'FILE_TOO_LARGE',
      `Le fichier dépasse la taille maximale de ${maxMb} Mo.`,
    );
  }
  return new AppException(400, 'FILE_TYPE_NOT_ALLOWED', 'Le fichier n’a pas pu être accepté.');
}
