import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ActorIdentity } from './status-move.service';

/**
 * Who is calling. Real callers must be authenticated through a validated Microsoft Entra ID
 * token; that validation belongs to the authentication component and is not built yet, so
 * until then every request answers 401, except in local development and tests:
 *
 *   AUTH_DEV_ACTOR=true  (default off; ignored when NODE_ENV=production)
 *
 * injects one fixed Lead test user. It is never read from a header or other request input.
 */
const DEV_ACTOR: ActorIdentity = { id: 'dev-lead', name: 'Dev Lead', role: 'Lead' };

export function resolveActor(
  env: Record<string, string | undefined> = process.env,
): ActorIdentity | null {
  if (env.NODE_ENV === 'production') return null;
  return env.AUTH_DEV_ACTOR === 'true' ? { ...DEV_ACTOR } : null;
}

@Injectable()
export class ActorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const actor = resolveActor();
    if (!actor) throw new UnauthorizedException('Sign in to continue.');
    context.switchToHttp().getRequest().actor = actor;
    return true;
  }
}

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ActorIdentity =>
    context.switchToHttp().getRequest().actor,
);
