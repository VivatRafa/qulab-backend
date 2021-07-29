import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express'
import { PurseService } from './purse.service';

@Controller('purse')
export class PurseController {
    constructor(private readonly purseService: PurseService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    addPurse(@Req() request: Request & { user: User } & { body: { address: string } }) {
        const userId = request?.user?.id;
        const { address } = request.body;

        return this.purseService.addPurse(userId, address);
    }
}
