import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AuthGuard } from './auth.guard';
import { createTokenVerifier } from './auth.module';
import { LeadGuard } from './lead.guard';
import { Principal, TokenVerifier } from './principal';

function ctx(request: object): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext;
}

const verifier: TokenVerifier = {
  verify: async (token) => (token === 'good' ? { id: 'u1', roles: ['Lead'] } : null),
};

describe('AuthGuard', () => {
  const guard = new AuthGuard(verifier);

  it('rejects a request with no token', async () => {
    await expect(guard.canActivate(ctx({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token the verifier does not accept', async () => {
    const request = { headers: { authorization: 'Bearer bad' } };
    await expect(guard.canActivate(ctx(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('sets the principal for a valid token', async () => {
    const request: { headers: object; principal?: Principal } = {
      headers: { authorization: 'Bearer good' },
    };
    expect(await guard.canActivate(ctx(request))).toBe(true);
    expect(request.principal).toEqual({ id: 'u1', roles: ['Lead'] });
  });
});

describe('LeadGuard', () => {
  const guard = new LeadGuard();

  it('allows a Lead', () => {
    expect(guard.canActivate(ctx({ principal: { id: 'u', roles: ['Lead'] } }))).toBe(true);
  });

  it('refuses a non-Lead and a missing principal', () => {
    expect(() => guard.canActivate(ctx({ principal: { id: 'u', roles: [] } }))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(ctx({}))).toThrow(ForbiddenException);
  });
});

describe('createTokenVerifier', () => {
  it('rejects everything unless NODE_ENV=test and TEST_AUTH=1', async () => {
    for (const env of [{}, { TEST_AUTH: '1' }, { NODE_ENV: 'production', TEST_AUTH: '1' }]) {
      expect(await createTokenVerifier(env).verify('lead-token')).toBeNull();
    }
    const test = createTokenVerifier({ NODE_ENV: 'test', TEST_AUTH: '1' });
    expect(await test.verify('lead-token')).toEqual({ id: 'test-lead', roles: ['Lead'] });
    expect(await test.verify('reporter-token')).toEqual({ id: 'test-reporter', roles: [] });
  });
});
