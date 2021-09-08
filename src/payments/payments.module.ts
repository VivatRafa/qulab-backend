import { Withdraw } from './entities/withdraw.entity';
import { BalanceModule } from './../balance/balance.module';
import { BalanceService } from './../balance/balance.service';
import { Payment } from './entities/payment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { forwardRef, HttpModule, Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AuthModule } from '../auth/auth.module';
import { Receiver } from './entities/receiver.entity';

@Module({
    imports: [HttpModule, forwardRef(() => AuthModule), TypeOrmModule.forFeature([Payment, Withdraw, Receiver]), forwardRef(() => BalanceModule)],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService],
})
export class PaymentsModule {}
