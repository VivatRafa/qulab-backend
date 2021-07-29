import { PaymentsService } from './../payments/payments.service';
import { DepositeService } from '../deposite/deposite.service';
import { Payment } from './../payments/entities/payment.entity';
import { OperationType } from './enums/operationType.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Deposite } from './../deposite/entities/deposite.entity';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';

const prepareOperations = (operations, type) => operations.map(({ id, date, status, amount }) => ({ id, amount, date, status, type }));

@Injectable()
export class OperationsService {
    constructor(private depositeService: DepositeService, private paymentService: PaymentsService) {}

    async findAll(userId: number) {
        const where = { where: { user_id: userId } };

        const depositeList = await this.depositeService.getDepositesBy(where);
        const paymentList = await this.paymentService.getPaymentsBy(where);
        const withdrawList = await this.paymentService.getWithdrawsByParams(where);

        const deposites = prepareOperations(depositeList, OperationType.deposite);
        const payments = prepareOperations(paymentList, OperationType.payment);
        const withdraws = prepareOperations(withdrawList, OperationType.deposite);

        return deposites.concat(payments, withdraws);
    }

}
