import { User } from './../users/entities/user.entity';
import { JwtAuthGuard } from './../auth/jwt-auth.guard';
import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Request } from 'express';
import { PaymentActionType } from './enums/paymentType.enum';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Get('replenishment')
    @UseGuards(JwtAuthGuard)
    getReplenishment(@Req() request: Request & { user: User }) {
        const userId = request?.user?.id;

        return this.paymentsService.getPayments(userId);
    }

    @Post('replenishment')
    @UseGuards(JwtAuthGuard)
    createPayout(@Req() request: Request & { user: User } & { body: { amount: number } }) {
        const { body, user } = request || {};
        const { id } = user || {};
        const { amount } = body || {};

        return this.paymentsService.createReplenishment(id, amount);
    }

    @Get('withdraw')
    @UseGuards(JwtAuthGuard)
    getWithdraw(@Req() request: Request & { user: User }) {
        const userId = request?.user?.id;

        return this.paymentsService.getWithdraws(userId);
    }

    @Post('withdraw')
    @UseGuards(JwtAuthGuard)
    withdraw(@Req() request: Request & { user: User } & { body: { amount: number; address: string } }) {
        const { body, user } = request || {};
        const { id } = user || {};
        const { amount, address } = body || {};

        return this.paymentsService.withdraw(id, amount, address);
    }

    @Post('replenishment-callback')// сделать хэш
    replenishmentCallback(@Req() request: Request) {
        
        return this.paymentsService.confirmReplenishment(request.body);
    }

    @Post('withdraw-callback')
    withdrawCallback(@Req() request: Request) {
        
        return this.paymentsService.confirmWithdraw(request.body);
    }
}
