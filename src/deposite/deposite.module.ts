import { Balance } from './../balance/entities/balance.entity';
import { Deposite } from './entities/deposite.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { DepositeService } from './deposite.service';
import { DepositeController } from './deposite.controller';
import { AuthModule } from '../auth/auth.module';
import { BalanceModule } from '../balance/balance.module';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [TypeOrmModule.forFeature([Deposite, Balance]), AuthModule, BalanceModule, UsersModule],
    controllers: [DepositeController],
    providers: [DepositeService],
    exports: [DepositeService],
})
export class DepositeModule {}
