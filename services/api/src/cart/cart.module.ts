import { Module } from '@nestjs/common';
import { ActorGuard } from '../defects/current-actor';
import { CartController } from './cart.controller';
import { CART_REPOSITORY } from './cart.repository';
import { CartService } from './cart.service';
import { PgCartRepository } from './pg-cart.repository';

@Module({
  controllers: [CartController],
  providers: [ActorGuard, CartService, { provide: CART_REPOSITORY, useClass: PgCartRepository }],
})
export class CartModule {}
