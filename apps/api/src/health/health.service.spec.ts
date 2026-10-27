import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports degraded when redis is down and hides connection details', async () => {
    const service = new HealthService(
      { ping: async () => true } as never,
      { ping: async () => false } as never,
      { ping: async () => true } as never,
    );

    await expect(service.check()).resolves.toEqual({
      status: 'degraded',
      checks: { api: 'ok', database: 'ok', redis: 'error', storage: 'ok' },
    });
  });

  it('reports storage separately without treating it as a database outage', async () => {
    const service = new HealthService(
      { ping: async () => true } as never,
      { ping: async () => true } as never,
      { ping: async () => false } as never,
    );

    await expect(service.check()).resolves.toEqual({
      status: 'degraded',
      checks: { api: 'ok', database: 'ok', redis: 'ok', storage: 'error' },
    });
  });
});
