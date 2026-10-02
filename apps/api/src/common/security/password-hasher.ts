import { Injectable } from '@nestjs/common';
import { hash, verify, Algorithm } from '@node-rs/argon2';

export const ARGON2ID_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export class PasswordPolicyError extends Error {
  constructor() {
    super('Password does not meet policy');
    this.name = 'PasswordPolicyError';
  }
}

@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    if (password.length < 12 || password.length > 128) {
      throw new PasswordPolicyError();
    }
    return hash(password, ARGON2ID_OPTIONS);
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    if (!passwordHash) return false;
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
