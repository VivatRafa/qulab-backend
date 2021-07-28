import { PaymentsModule } from './../payments/payments.module';
import { DepositeModule } from './../deposite/deposite.module';
import { Module } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { OperationsController } from './operations.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [DepositeModule, PaymentsModule, AuthModule],
    controllers: [OperationsController],
    providers: [OperationsService],
})
export class OperationsModule {}
