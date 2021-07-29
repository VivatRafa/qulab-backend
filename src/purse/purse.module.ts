import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { PurseService } from './purse.service';
import { Purse } from './entity/purse.entity';
import { PurseController } from './purse.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Purse]), forwardRef(() => AuthModule)],
    controllers: [PurseController],
    providers: [PurseService],
    exports: [PurseService],
})
export class PurseModule {}
