import { Principal, TokenVerifier } from './principal';

// Only bound when NODE_ENV=test and TEST_AUTH=1 (see auth.module.ts).
export class TestTokenVerifier implements TokenVerifier {
  async verify(bearerToken: string): Promise<Principal | null> {
    if (bearerToken === 'lead-token') return { id: 'test-lead', roles: ['Lead'] };
    if (bearerToken === 'reporter-token') return { id: 'test-reporter', roles: [] };
    return null;
  }
}
