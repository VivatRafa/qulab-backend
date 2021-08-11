import { ReferralAward } from './entities/referralAward.entity';
import { UsersModule } from './../users/users.module';
import { Deposite } from './../deposite/entities/deposite.entity';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Balance } from './entities/balance.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module, forwardRef, HttpModule } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { BalanceController } from './balance.controller';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [HttpModule, TypeOrmModule.forFeature([Balance, Deposite, ReferralAward]), forwardRef(() => UsersModule), forwardRef(() => AuthModule), forwardRef(() => PaymentsModule)],
    controllers: [BalanceController],
    providers: [BalanceService],
    exports: [BalanceService],
})
export class BalanceModule {}
