import { User } from './../users/entities/user.entity';
import { JwtAuthGuard } from './../auth/jwt-auth.guard';
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { Request } from 'express';

@Controller('balance')
export class BalanceController {
    constructor(private readonly balanceService: BalanceService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll(@Req() request: Request & { user: User }) {
        const userId = request?.user?.id;

        return this.balanceService.getBalance(userId);
    }

    @Get('referral-awards')
    @UseGuards(JwtAuthGuard)
    getReferralAwards(@Req() request: Request & { user: User }) {
        const userId = request?.user?.id;

        return this.balanceService.getReferralAwards(userId);
    }
}
