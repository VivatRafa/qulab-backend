import { Module } from '@nestjs/common';
import { PurseService } from './purse.service';

@Module({
    providers: [PurseService],
})
export class PurseModule {}
