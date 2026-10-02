import { httpUrlSchema, updateProfileSchema } from '@thesispartner/validation';

describe('updateProfileSchema', () => {
  it('rejects an unknown property', () => {
    const parsed = updateProfileSchema.safeParse({ nickname: 'Ada' });
    expect(parsed.success).toBe(false);
  });

  it('rejects an invalid URL and an invalid ORCID', () => {
    expect(httpUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
    expect(updateProfileSchema.safeParse({ orcid: '1234' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ googleScholarUrl: 'not-a-url' }).success).toBe(false);
  });

  it('accepts a partial academic update', () => {
    const parsed = updateProfileSchema.safeParse({
      specialty: 'Informatique',
      orcid: '0000-0001-2345-6789',
      laboratory: '',
    });
    expect(parsed.success).toBe(true);
  });
});
