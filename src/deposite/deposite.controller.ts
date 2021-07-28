import { User } from './../users/entities/user.entity';
import { JwtAuthGuard } from './../auth/jwt-auth.guard';
import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Req,
    UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { DepositeService } from './deposite.service';
import { CreateDepositeDto } from './dto/create-deposite.dto';
import { UpdateDepositeDto } from './dto/update-deposite.dto';

@Controller('deposite')
export class DepositeController {
    constructor(private readonly depositeService: DepositeService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    createDeposite(@Req() request: Request & { user: User }) {
        const { body, user } = request || {};
        const { id } = user || {};

        return this.depositeService.createDeposite(id, body);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll(@Req() request: Request & { user: User }) {
        const userId = request?.user?.id;

        return this.depositeService.getDeposites(userId);
    }
}
