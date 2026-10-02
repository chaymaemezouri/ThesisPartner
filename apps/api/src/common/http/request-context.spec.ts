import { resolveRequestId } from './request-context';

describe('resolveRequestId', () => {
  it('keeps a valid incoming id', () => {
    expect(resolveRequestId('req-12345678')).toBe('req-12345678');
  });

  it('replaces missing or unsafe ids', () => {
    expect(resolveRequestId(undefined)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(resolveRequestId('bad id')).not.toBe('bad id');
    expect(resolveRequestId('short')).not.toBe('short');
  });
});
