import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Principal, TOKEN_VERIFIER, TokenVerifier } from './principal';

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  principal?: Principal;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const match = typeof header === 'string' ? /^Bearer (.+)$/.exec(header) : null;
    if (!match) throw new UnauthorizedException('Sign in to continue.');
    const principal = await this.verifier.verify(match[1]);
    if (!principal) throw new UnauthorizedException('Sign in to continue.');
    request.principal = principal;
    return true;
  }
}
