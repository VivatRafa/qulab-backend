import { JwtAuthGuard } from './../auth/jwt-auth.guard';
import { User } from './../users/entities/user.entity';
import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { OperationsService } from './operations.service';

@Controller('operations')
export class OperationsController {
    constructor(private readonly operationsService: OperationsService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll(@Req() request: Request & { user: User }) {
        const userId = request?.user?.id;

        return this.operationsService.findAll(userId);
    }
}
