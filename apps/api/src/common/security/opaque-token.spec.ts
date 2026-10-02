import { hashOpaqueToken, safeEqual, tokenMatchesHash } from './opaque-token';

describe('opaque tokens', () => {
  it('compares equal strings without accepting a different value', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('matches a token to its hash and rejects another token', () => {
    const hash = hashOpaqueToken('session-token');
    expect(tokenMatchesHash('session-token', hash)).toBe(true);
    expect(tokenMatchesHash('other-token', hash)).toBe(false);
  });
});
