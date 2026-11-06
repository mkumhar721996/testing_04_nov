import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { LEAD_ROLE } from '../auth/principal';

@Controller('me/access')
@UseGuards(AuthGuard)
export class MeController {
  @Get()
  me(@Req() request: AuthenticatedRequest): { isLead: boolean } {
    return { isLead: request.principal?.roles.includes(LEAD_ROLE) ?? false };
  }
}
