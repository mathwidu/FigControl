import { BadRequestException } from '@nestjs/common';
import { evaluatePasswordPolicy } from '@figcontrol/shared';
import bcrypt from 'bcryptjs';

const PASSWORD_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function assertPasswordsMatch(password: string, confirmPassword: string): void {
  if (password !== confirmPassword) {
    throw new BadRequestException('Password confirmation does not match.');
  }
}

export function assertPasswordPolicy(password: string): void {
  const result = evaluatePasswordPolicy(password);

  if (!result.valid) {
    const missing = result.requirements
      .filter((requirement) => !requirement.met)
      .map((requirement) => requirement.label.toLowerCase());

    throw new BadRequestException(`A senha precisa ter: ${missing.join(', ')}.`);
  }
}
