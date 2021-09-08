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
import { BalanceService } from '../balance/balance.service';
import { BalanceType } from '../balance/enum/balanceType.enum';
import { BalanceActionType } from '../balance/enum/balanceActionType.enum';
import * as dayjs from 'dayjs'
import { UsersService } from 'src/users/users.service';

const SENIOR_TARIFF_ID = 3;

@Injectable()
export class DepositeService {
    constructor(
        @InjectRepository(Deposite)
        private readonly depositeRepository: Repository<Deposite>,
        @InjectRepository(Balance)
        private readonly balanceRepository: Repository<Balance>,
        private balanceService: BalanceService,
        private userService: UsersService,
    ) {
        this.updateDepositeAmount();
    }

    getTariffId(amount: number) {
        const { tariffs } = depositeConfig;
        const tariffId = Object.keys(tariffs).find(tariffId => {
            const { amount: { from, until } } = tariffs[tariffId];

            const gteFrom = Big(amount).gte(Big(from));
            const lteUntil = Big(amount).lte(Big(until))
            return gteFrom && lteUntil;
        })

        return Number(tariffId) || SENIOR_TARIFF_ID;
    }

    async createDeposite(userId: number, createDepositeDto: CreateDepositeDto) {
        const { amount } = createDepositeDto;

        if (typeof amount !== 'number') throw new HttpException('Сумма должна быть числом', HttpStatus.BAD_REQUEST);

        const bigAmount = Big(amount);

        if (bigAmount.lt(depositeConfig.min)) throw new HttpException('Не меньше 100 QU', HttpStatus.BAD_REQUEST);


        const { balance, invested, id: balanceId } = (await this.balanceService.getBalanceByParam({ where: { user_id: userId } })) || {};

        const tariffId = this.getTariffId(amount);
        const oldBalance = Big(balance);
        // balance >= amount
        const isBalanceLessOrEqualThanAmount = oldBalance.gte(bigAmount);

        if (!isBalanceLessOrEqualThanAmount) throw new HttpException('На балансе недостаточно средств', HttpStatus.BAD_REQUEST);

        const deposite: Omit<Deposite, 'id'> = {
            user_id: userId,
            date: new Date(),
            amount,
            profit: 0,
            tariff_id: tariffId,
            status: PaymentActionStatus.inProgress,
        };
        this.depositeRepository.save(deposite);

        // balance - depositeAmount
        const newBalance = Big(balance).minus(bigAmount).toNumber();
        // invested + depositeAmount
        const newInvested = Big(invested).plus(bigAmount).toNumber();

        this.balanceRepository.update(balanceId, { balance: newBalance, invested: newInvested });

        this.balanceService.addAwardToParentByUserStatus(userId, amount);

        this.userService.updateUserStatus(userId);
        this.userService.updateUserAwards(userId);
        return {
            success: true,
        };
    }

    async closeDeposite(userId: number, depositeId: number) {

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
        const depositesList = await this.depositeRepository.find({ where: { status: PaymentActionStatus.inProgress } });

        depositesList.forEach((deposite) => {
            const { percent: percentFromConfig, days: depositeDaysLimit } = depositeConfig.tariffs[deposite.tariff_id];

            const beginDate = dayjs(deposite.date);
            const today = dayjs();
            const daysFromBegin = beginDate.diff(today, 'day');

            const isDepositeExpired = daysFromBegin >= depositeDaysLimit;
            
            const percent = Big(percentFromConfig);
            const amount = Big(deposite.amount);
            const profit = Big(deposite.profit);
            const newAmount = amount.times(percent);
            
            const newProfit = profit.plus(newAmount.minus(amount)).toNumber();

            const updatedDeposite: Partial<Deposite> = {
                profit: newProfit,
                ...(isDepositeExpired && { status: PaymentActionStatus.done })
            }

            this.depositeRepository.update(deposite.id, updatedDeposite);

            this.balanceService.balanceAction(deposite.user_id, BalanceType.balance, profit.toNumber(), BalanceActionType.increase);
        });
    }

    getRandomPercent(max, min) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }
}
