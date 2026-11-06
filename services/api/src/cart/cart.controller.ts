import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ActorGuard, CurrentActor } from '../defects/current-actor';
import { ActorIdentity } from '../defects/status-move.service';
import { CartLineRecord } from './cart.repository';
import { CartService } from './cart.service';

function toDto(l: CartLineRecord) {
  return {
    id: l.id,
    partNumber: l.partNumber,
    description: l.description,
    sapInstance: l.sapInstance,
    stockShown: l.stockShown,
    quantity: l.quantity,
  };
}

@Controller('cart')
@UseGuards(ActorGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  async list(@CurrentActor() actor: ActorIdentity) {
    return { lines: (await this.cart.list(actor.id)).map(toDto) };
  }

  @Patch('lines/:id')
  async change(
    @Param('id') id: string,
    @CurrentActor() actor: ActorIdentity,
    @Body() body: unknown,
  ) {
    const { quantity } = (body ?? {}) as Record<string, unknown>;
    const result = await this.cart.changeQuantity(actor.id, id, quantity);
    switch (result.kind) {
      case 'ok':
        return toDto(result.line);
      case 'invalid':
        throw new BadRequestException('Quantity must be a whole number greater than 0.');
      case 'over-stock':
        throw new ConflictException({
          message: `Only ${result.stock} in stock.`,
          stock: result.stock,
        });
      default:
        throw new NotFoundException('Cart line not found.');
    }
  }

  @Delete('lines/:id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentActor() actor: ActorIdentity) {
    if (!(await this.cart.remove(actor.id, id))) throw new NotFoundException('Cart line not found.');
  }
}
