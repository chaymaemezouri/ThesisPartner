import type { ApiErrorBody } from '@thesispartner/types';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@thesispartner/types';
import { apiErrorBodySchema } from '@thesispartner/validation';
import type { ZodType } from 'zod';

export class ApiClientError extends Error {
  readonly body: ApiErrorBody;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiClientError';
    this.body = body;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/**
 * Session cookies travel with credentials. The CSRF value is read from the
 * non-HttpOnly cookie and sent as a header. Nothing is written to localStorage.
 */
export async function apiGet<T>(
  path: string,
  schema: ZodType<T>,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  return request(path, schema, { method: 'GET' }, fetchImpl);
}

export async function apiSend<T>(
  path: string,
  schema: ZodType<T>,
  body: unknown,
  method: 'POST' | 'PATCH' | 'DELETE' = 'POST',
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  return request(path, schema, { method, body }, fetchImpl);
}

async function request<T>(
  path: string,
  schema: ZodType<T>,
  options: { method: Method; body?: unknown },
  fetchImpl: typeof fetch,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    const csrf = readCookie(CSRF_COOKIE_NAME);
    if (csrf) headers[CSRF_HEADER_NAME] = csrf;
  }

  const base = import.meta.env.VITE_API_URL ?? '';
  const response = await fetchImpl(`${base}${path}`, {
    method: options.method,
    credentials: 'include',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = apiErrorBodySchema.safeParse(payload);
    throw new ApiClientError(
      parsed.success
        ? (parsed.data as ApiErrorBody)
        : {
            statusCode: response.status,
            code: 'INTERNAL_ERROR',
            message: 'Unexpected response',
            errors: [],
            requestId: response.headers.get('x-request-id') ?? 'unknown',
          },
    );
  }

  return schema.parse(payload);
}

export function apiUpload<T>(
  path: string,
  schema: ZodType<T>,
  file: File,
  onProgress?: (loaded: number, total: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const base = import.meta.env.VITE_API_URL ?? '';
    xhr.open('POST', `${base}${path}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Accept', 'application/json');
    const csrf = readCookie(CSRF_COOKIE_NAME);
    if (csrf) xhr.setRequestHeader(CSRF_HEADER_NAME, csrf);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded, event.total);
    };
    xhr.onload = () => {
      let payload: unknown = null;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        payload = null;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const parsed = apiErrorBodySchema.safeParse(payload);
        reject(
          new ApiClientError(
            parsed.success
              ? (parsed.data as ApiErrorBody)
              : {
                  statusCode: xhr.status,
                  code: 'INTERNAL_ERROR',
                  message: 'Unexpected response',
                  errors: [],
                  requestId: xhr.getResponseHeader('x-request-id') ?? 'unknown',
                },
          ),
        );
        return;
      }
      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        reject(
          new ApiClientError({
            statusCode: xhr.status,
            code: 'INTERNAL_ERROR',
            message: 'Unexpected response',
            errors: [],
            requestId: xhr.getResponseHeader('x-request-id') ?? 'unknown',
          }),
        );
        return;
      }
      resolve(parsed.data);
    };
    xhr.onerror = () => {
      reject(
        new ApiClientError({
          statusCode: 0,
          code: 'INTERNAL_ERROR',
          message: 'Le service est indisponible.',
          errors: [],
          requestId: 'unknown',
        }),
      );
    };
    const body = new FormData();
    body.append('file', file);
    xhr.send(body);
  });
}

export function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  for (const part of document.cookie.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return undefined;
}
