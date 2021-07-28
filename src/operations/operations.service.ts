import { PaymentsService } from './../payments/payments.service';
import { DepositeService } from '../deposite/deposite.service';
import { Payment } from './../payments/entities/payment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Deposite } from './../deposite/entities/deposite.entity';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';

@Injectable()
export class OperationsService {
    constructor(private depositeService: DepositeService, private paymentService: PaymentsService) {}

    async findAll(userId: number) {
        const where = { where: { user_id: userId } };
        const depositeList = await this.depositeService.getDepositesBy(where);
        const paymentActionsList = await this.paymentService.getPaymentsBy(where);

        return;
    }
}
