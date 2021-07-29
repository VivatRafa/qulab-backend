import { Balance } from './../balance/entities/balance.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Big } from 'big.js';
import { deposite as depositeConfig } from './../config/deposite';
import { createQueryBuilder, Repository } from 'typeorm';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateDepositeDto } from './dto/create-deposite.dto';
import { UpdateDepositeDto } from './dto/update-deposite.dto';
import { Deposite } from './entities/deposite.entity';
import { PaymentActionStatus } from '../payments/enums/paymentStatus.entity';
import { BalanceService } from 'src/balance/balance.service';
import { BalanceType } from 'src/balance/enum/balanceType.enum';
import { BalanceActionType } from 'src/balance/enum/balanceActionType.enum';

@Injectable()
export class DepositeService {
    constructor(
        @InjectRepository(Deposite)
        private readonly depositeRepository: Repository<Deposite>,
        @InjectRepository(Balance)
        private readonly balanceRepository: Repository<Balance>,
        private balanceService: BalanceService,
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
            tariff_id: tariffId,
            status: PaymentActionStatus.done,
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
        const depositesList = await this.depositeRepository.find();

        depositesList.forEach((deposite) => {
            
            const percentFromConfig = depositeConfig.tariffs[deposite.tariff_id];
            const percent = Big(percentFromConfig);
            const oldAmount = Big(deposite.amount);
            const profit = Big(deposite.profit);
            const newAmount = oldAmount.times(percent);
            // profit = oldProfit + (newAmount - oldAmount)
            const newProfit = profit.plus(newAmount.minus(oldAmount));

            const newDeposite: Deposite = {
                ...deposite,
                amount: newAmount.toNumber(),
                profit: newProfit.toNumber(),
            };

            this.depositeRepository.save(newDeposite);
            this.balanceService.balanceAction(deposite.user_id, BalanceType.balance, newAmount.toNumber(), BalanceActionType.increase);
            
        });
    }

    getRandomPercent(max, min) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }
}
