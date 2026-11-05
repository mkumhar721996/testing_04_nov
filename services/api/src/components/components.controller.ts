import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { LeadGuard } from '../auth/lead.guard';
import { ComponentRecord, ComponentStatus } from './components.repository';
import { ComponentsService } from './components.service';

interface NameBody {
  name?: unknown;
}

@Controller('components')
@UseGuards(AuthGuard)
export class ComponentsController {
  constructor(@Inject(ComponentsService) private readonly service: ComponentsService) {}

  @Get()
  list(@Query('status') status?: string): Promise<ComponentRecord[]> {
    if (status !== undefined && status !== 'active' && status !== 'retired') {
      throw new BadRequestException('status must be "active" or "retired".');
    }
    return this.service.list(status as ComponentStatus | undefined);
  }

  @Post()
  @UseGuards(LeadGuard)
  add(@Body() body: NameBody): Promise<ComponentRecord> {
    return this.service.add(body?.name);
  }

  @Patch(':id')
  @UseGuards(LeadGuard)
  rename(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: NameBody,
  ): Promise<ComponentRecord> {
    return this.service.rename(id, body?.name);
  }

  @Post(':id/retire')
  @UseGuards(LeadGuard)
  retire(@Param('id', ParseUUIDPipe) id: string): Promise<ComponentRecord> {
    return this.service.retire(id);
  }
}
