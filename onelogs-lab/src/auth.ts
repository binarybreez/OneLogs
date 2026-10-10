import { UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { Request } from 'express';
import { dataset, type User } from './data';

const sessions = new Map<string, string>(); // token -> user id (in memory, lab only)

export const issueToken = (userId: string): string => {
  const token = randomBytes(24).toString('base64url');
  sessions.set(token, userId);
  return token;
};
export const resolveToken = (token: string): string | undefined =>
  sessions.get(token);
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex').slice(0, 16);

export function requireUser(req: Request): User {
  const id = req.lab.user_id;
  const user = id ? dataset.usersById.get(id) : undefined;
  if (!user) throw new UnauthorizedException('Missing or invalid token');
  return user;
}
