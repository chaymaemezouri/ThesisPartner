import { PasswordHasher, PasswordPolicyError } from './password-hasher';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('hashes with argon2id and verifies the same password', async () => {
    const password = 'correct-horse-battery';
    const passwordHash = await hasher.hash(password);

    expect(passwordHash).not.toContain(password);
    expect(passwordHash).toContain('argon2id');
    await expect(hasher.verify(password, passwordHash)).resolves.toBe(true);
    await expect(hasher.verify('wrong-password-value', passwordHash)).resolves.toBe(false);
  });

  it('rejects passwords outside the length policy', async () => {
    await expect(hasher.hash('short')).rejects.toBeInstanceOf(PasswordPolicyError);
  });
});
