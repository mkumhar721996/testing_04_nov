import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from './auth.guard';
import { LEAD_ROLE } from './principal';

@Injectable()
export class LeadGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { principal } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!principal?.roles.includes(LEAD_ROLE)) {
      throw new ForbiddenException('Only Leads can change the component list.');
    }
    return true;
  }
}
