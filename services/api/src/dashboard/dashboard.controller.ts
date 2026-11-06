import { Controller, Get } from '@nestjs/common';
import { AuthUser, CurrentUser } from './auth-user';
import type { CardSummaryDto, OverviewDto, ProfileDto, TransactionDto } from './dashboard.dto';
import { DashboardService } from './dashboard.service';

@Controller('me')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  profile(@CurrentUser() user: AuthUser): Promise<ProfileDto> {
    return this.dashboard.profile(user);
  }

  @Get('card-summary')
  cardSummary(@CurrentUser() user: AuthUser): Promise<CardSummaryDto> {
    return this.dashboard.cardSummary(user);
  }

  @Get('overview')
  overview(@CurrentUser() user: AuthUser): Promise<OverviewDto> {
    return this.dashboard.overview(user);
  }

  @Get('transactions')
  transactions(@CurrentUser() user: AuthUser): Promise<TransactionDto[]> {
    return this.dashboard.transactions(user);
  }
}
