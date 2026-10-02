import { profileCompletion } from './completion';

describe('profileCompletion', () => {
  it('counts only the fields a new account already has', () => {
    const result = profileCompletion({
      givenName: 'Camille',
      familyName: 'Martin',
      institution: null,
      laboratory: null,
      specialty: ' ',
      avatarUrl: null,
      orcid: null,
    });

    expect(result.percentage).toBe(29);
    expect(result.missingFields).toEqual([
      'institution',
      'laboratory',
      'specialty',
      'avatarUrl',
      'orcid',
    ]);
  });

  it('reaches 100 when every tracked field is present', () => {
    const result = profileCompletion({
      givenName: 'Camille',
      familyName: 'Martin',
      institution: 'Université',
      laboratory: 'Laboratoire',
      specialty: 'Informatique',
      avatarUrl: 'https://example.edu/a.png',
      orcid: '0000-0001-2345-6789',
    });

    expect(result).toEqual({ percentage: 100, missingFields: [] });
  });
});
