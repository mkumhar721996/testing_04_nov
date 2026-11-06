import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

/** The signed-in user, as verified by the authentication layer (Microsoft Entra ID story). */
export type AuthUser = { subject: string; name?: string };

/** Reads the verified user off the request; no verified user means 401. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
  if (!user?.subject) throw new UnauthorizedException();
  return user;
});
