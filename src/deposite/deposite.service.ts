import { Balance } from './../balance/entities/balance.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Big } from 'big.js';
import { deposite as depositeConfig } from './../config/deposite';
import { createQueryBuilder, Repository } from 'typeorm';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateDepositeDto } from './dto/create-deposite.dto';
import { UpdateDepositeDto } from './dto/update-deposite.dto';
import { DepositeTariff } from './entities/depositeTariff.entity';
import { Deposite } from './entities/deposite.entity';
import { PaymentActionStatus } from '../payments/enums/paymentStatus.entity';

@Injectable()
export class DepositeService {
    constructor(
        @InjectRepository(Deposite)
        private readonly depositeRepository: Repository<Deposite>,
        @InjectRepository(Balance)
        private readonly balanceRepository: Repository<Balance>,
    ) {}

    async createDeposite(userId: number, data: CreateDepositeDto) {
        const { amount, tariffId } = data;
        const { balance, invested, id: balanceId } = (await this.balanceRepository.findOne({ where: { user_id: userId } })) || {};

        const bAmount = Big(amount);
        const oldBalance = Big(balance);
        // balance >= amount
        const isBalanceLessOrEqualThanAmount = oldBalance.gte(bAmount);

        if (!isBalanceLessOrEqualThanAmount) throw new HttpException('На балансе недостаточно средств', HttpStatus.BAD_REQUEST);

        const deposite: Omit<Deposite, 'id'> = {
            user_id: userId,
            date: new Date(),
            amount,
            profit: 0,
            deposite_tariff_id: tariffId,
            status_id: PaymentActionStatus.done,
        };
        this.depositeRepository.save(deposite);

        // balance - depositeAmount
        const newBalance = Big(balance).minus(bAmount).toNumber();
        // invested + depositeAmount
        const newInvested = Big(invested).plus(bAmount).toNumber();

        this.balanceRepository.update(balanceId, { balance: newBalance, invested: newInvested });

        return {
            success: true,
        };
    }

    async getDepositesBy(params) {
        const deposites = await this.depositeRepository.find(params);

        return deposites;
    }

    async getDeposites(userId: number) {
        const depositeList = await this.depositeRepository.find({ where: { user_id: userId } });

        return depositeList;
    }

    async updateDepositeAmount() {
        const { MAX_DEPOSITE_PERCENT, MIN_DEPOSITE_PERCENT } = depositeConfig;
        const randomPercent = Big(this.getRandomPercent(MAX_DEPOSITE_PERCENT, MIN_DEPOSITE_PERCENT));

        const depositesList = await this.depositeRepository.find();
        const updateDepositeList = depositesList.forEach((deposite) => {
            const oldAmount = Big(deposite.amount);
            const profit = Big(deposite.profit);
            const newAmount = oldAmount.times(randomPercent);
            // profit = oldProfit + (newAmount - oldAmount)
            const newProfit = profit.plus(newAmount.minus(oldAmount));

            const newDeposite: Deposite = {
                ...deposite,
                amount: newAmount.toNumber(),
                profit: newProfit.toNumber(),
            };

            this.depositeRepository.save(newDeposite);
        });
    }

    getRandomPercent(max, min) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }
}
