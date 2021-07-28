import { PaymentRequest } from './entities/paymentRequest.entity';
import { Withdraw } from './entities/withdraw.entity';
import { BalanceModule } from './../balance/balance.module';
import { BalanceService } from './../balance/balance.service';
import { Payment } from './entities/payment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule, Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [HttpModule, AuthModule, TypeOrmModule.forFeature([Payment, PaymentRequest, Withdraw]), BalanceModule],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService],
})
export class PaymentsModule {}
