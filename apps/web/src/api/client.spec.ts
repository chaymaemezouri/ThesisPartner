import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@thesispartner/types';
import { ackSchema, healthResponseSchema } from '@thesispartner/validation';
import { describe, expect, it, vi } from 'vitest';
import { apiGet, apiSend, ApiClientError } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-request-id': 'req-client-1' },
  });
}

describe('apiGet', () => {
  it('parses a health payload and does not touch localStorage', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        status: 'ok',
        checks: { api: 'ok', database: 'ok', redis: 'ok', storage: 'ok' },
      }),
    );

    const body = await apiGet('/api/v1/health', healthResponseSchema, fetchImpl);
    expect(body.status).toBe('ok');
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/v1/health',
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(window.localStorage.length).toBe(0);
  });

  it('maps a non-JSON 413 to PAYLOAD_TOO_LARGE', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response('<html>413 Request Entity Too Large</html>', {
          status: 413,
          headers: { 'content-type': 'text/html', 'x-request-id': 'req-client-413' },
        }),
    );

    await expect(apiGet('/api/v1/health', healthResponseSchema, fetchImpl)).rejects.toMatchObject({
      body: { statusCode: 413, code: 'PAYLOAD_TOO_LARGE' },
    });
  });

  it('throws the shared error contract', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        {
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'Resource not found',
          errors: [],
          requestId: 'req-client-1',
        },
        404,
      ),
    );

    await expect(apiGet('/api/v1/missing', healthResponseSchema, fetchImpl)).rejects.toBeInstanceOf(
      ApiClientError,
    );
  });

  it('sends the CSRF cookie as a header and still ignores localStorage', async () => {
    document.cookie = `${CSRF_COOKIE_NAME}=csrf-value`;
    const fetchImpl = vi.fn(async () => jsonResponse({ status: 'ok' }));

    await apiSend('/api/v1/auth/logout', ackSchema, {}, 'POST', fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/v1/auth/logout',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ [CSRF_HEADER_NAME]: 'csrf-value' }),
      }),
    );
    expect(window.localStorage.length).toBe(0);
  });
});
