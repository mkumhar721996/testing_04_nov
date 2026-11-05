import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { LeadGuard } from './lead.guard';
import { TOKEN_VERIFIER, TokenVerifier } from './principal';
import { TestTokenVerifier } from './test-token-verifier';

// Fail closed until the authentication story supplies the Entra verifier.
const rejectEverything: TokenVerifier = { verify: async () => null };

// TEST_AUTH=1 is honoured only when NODE_ENV=test; it is never read in production.
export function createTokenVerifier(env: NodeJS.ProcessEnv = process.env): TokenVerifier {
  return env.NODE_ENV === 'test' && env.TEST_AUTH === '1'
    ? new TestTokenVerifier()
    : rejectEverything;
}

@Module({
  providers: [{ provide: TOKEN_VERIFIER, useFactory: () => createTokenVerifier() }, AuthGuard, LeadGuard],
  exports: [TOKEN_VERIFIER, AuthGuard, LeadGuard],
})
export class AuthModule {}
