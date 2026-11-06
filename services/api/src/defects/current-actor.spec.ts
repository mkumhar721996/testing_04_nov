import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ActorGuard, resolveActor } from './current-actor';

describe('resolveActor', () => {
  it('returns the fixed dev Lead only when enabled outside production', () => {
    expect(resolveActor({ AUTH_DEV_ACTOR: 'true', NODE_ENV: 'development' })).toEqual({
      id: 'dev-lead',
      name: 'Dev Lead',
      role: 'Lead',
    });
  });

  it('is off by default', () => {
    expect(resolveActor({ NODE_ENV: 'development' })).toBeNull();
  });

  it('is ignored in production', () => {
    expect(resolveActor({ AUTH_DEV_ACTOR: 'true', NODE_ENV: 'production' })).toBeNull();
  });
});

describe('ActorGuard', () => {
  const ctx = (req: object) =>
    ({ switchToHttp: () => ({ getRequest: () => req }) }) as never;

  it('answers 401 when no actor can be resolved', () => {
    const prev = process.env.AUTH_DEV_ACTOR;
    delete process.env.AUTH_DEV_ACTOR;
    try {
      expect(() => new ActorGuard().canActivate(ctx({}))).toThrow(UnauthorizedException);
    } finally {
      if (prev !== undefined) process.env.AUTH_DEV_ACTOR = prev;
    }
  });

  it('attaches the dev actor to the request, ignoring request input', () => {
    const prevA = process.env.AUTH_DEV_ACTOR;
    const prevN = process.env.NODE_ENV;
    process.env.AUTH_DEV_ACTOR = 'true';
    process.env.NODE_ENV = 'development';
    try {
      const req: { actor?: unknown; headers: Record<string, string> } = {
        headers: { 'x-role': 'Tester' },
      };
      expect(new ActorGuard().canActivate(ctx(req))).toBe(true);
      expect(req.actor).toMatchObject({ role: 'Lead' });
    } finally {
      if (prevA === undefined) delete process.env.AUTH_DEV_ACTOR;
      else process.env.AUTH_DEV_ACTOR = prevA;
      process.env.NODE_ENV = prevN;
    }
  });
});
