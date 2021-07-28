import { User } from './entities/user.entity';
import { Body, Controller, Get, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    getAll(@Req() request: Request & { user: User }) {
        const userId = request?.user?.id;
        return this.usersService.getUserInfo(userId);
    }

    @Get('top-referrals')
    @UseGuards(JwtAuthGuard)
    getTopReferrals() {
        return this.usersService.getTopReferrals();
    }

    @Get('referral-info')
    @UseGuards(JwtAuthGuard)
    getReferralAwards(@Req() request: Request & { user: User }) {
        const userId = request?.user?.id;

        return this.usersService.getReferralsInfo(userId);
    }

    @Get('structure')
    @UseGuards(JwtAuthGuard)
    getStructure(@Req() request: Request & { user: User }) {
        const userId = request?.user?.id;

        return this.usersService.getStructure(userId);
    }
}
