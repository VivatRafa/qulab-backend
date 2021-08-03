import { ReferralAward } from './entities/referralAward.entity';
import { User } from './../users/entities/user.entity';
import { UsersService } from './../users/users.service';
import { Deposite } from './../deposite/entities/deposite.entity';
import { BalanceType } from './enum/balanceType.enum';
import { Big } from 'big.js';
import { Balance } from './entities/balance.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateBalanceDto } from './dto/create-balance.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { BalanceActionType } from './enum/balanceActionType.enum';
import { HoldActionType } from './enum/holdActionType.enum';

const referralAwards = [0.1, 0.05];

@Injectable()
export class BalanceService {
    constructor(
        @InjectRepository(Deposite)
        private readonly depositeRepository: Repository<Deposite>,
        @InjectRepository(Balance)
        private readonly balanceRepository: Repository<Balance>,
        @InjectRepository(ReferralAward)
        private readonly referralAwardRepository: Repository<ReferralAward>,
        @Inject(forwardRef(() => UsersService))
        private userService: UsersService,
    ) {}

    async createBalance(userId) {
        const emptyBalance: Omit<Balance, 'id'> = {
            user_id: userId,
            withdrawn: 0,
            referral: 0,
            invested: 0,
            balance: 0,
            holdBalance: 0,
            referral_award: 0,
        };

        await this.balanceRepository.save(emptyBalance);
    }

    async holdAmountAction(userId: number, amount: number, actionType: HoldActionType) {
        const { id, balance, holdBalance } = await this.balanceRepository.findOne({ where: { user_id: userId } });

        const bigAmount = Big(amount);
        const bigBalance = Big(balance);
        const bigHoldBalance = Big(holdBalance);

        const newBalance = actionType === HoldActionType.hold ? bigBalance.minus(bigAmount) : bigBalance.plus(bigAmount);
        const newHoldBalance = actionType === HoldActionType.hold ? bigHoldBalance.plus(bigAmount) : bigHoldBalance.plus(bigAmount);

        const changedBalance: Partial<Balance> = {
            balance: newBalance.toNumber(),
            holdBalance: newHoldBalance.toNumber(),
        };

        this.balanceRepository.update(id, changedBalance);
    }

    async getBalance(userId: number) {
        const balanceInfo = await this.balanceRepository.findOne({ where: { user_id: userId } });

        delete balanceInfo.user_id;

        return balanceInfo;
    }

    async getBalanceByParam(params: FindOneOptions<Balance>) {
        const balance = await this.balanceRepository.findOne(params);

        return balance;
    }

    async getBalancesByParam(params: FindManyOptions<Balance>) {
        const balance = await this.balanceRepository.find(params);

        return balance;
    }

    async balanceAction(userId: number, balanceType: BalanceType, amount: number, actionType: BalanceActionType) {
        const currentBalance = await this.balanceRepository.findOne({ where: { user_id: userId } });

        const increaseValue = Big(amount);
        const oldValue = Big(currentBalance[balanceType]);
        const newValue =
            actionType === BalanceActionType.increase ? oldValue.plus(increaseValue) : oldValue.minus(increaseValue);

        this.balanceRepository.update(currentBalance.id, { [balanceType]: newValue.toNumber() });
    }

    async addReferralToParent(userId: number, amount: number, referralLevel = 1) {
        const { referral_id: referralId } = await this.userService.getUserByParams({ where: { id: userId } });
        
        // Есть ли верхний реферал
        if (referralId) {
            // смотрим статус
            const { status_id } = await this.userService.getUserByParams({ where: { id: referralId } })
            // Увеличиваем оборот рефералов 
            this.balanceAction(referralId, BalanceType.referral, amount, BalanceActionType.increase);

            // узнаем какой бонус
            const { award: referralAward } = this.userService.getStatusInfo(status_id) || {};
    
            if (referralAward) {
                const bigReferralAward = Big(referralAward);
                const bigAmount = Big(amount);
                const awardAmount = bigAmount.times(bigReferralAward).toNumber();
                // начисляем бонус за реферала
                this.balanceAction(referralId, BalanceType.balance, awardAmount, BalanceActionType.increase);

                const newReferralAward: Omit<ReferralAward, 'id'> = {
                    user_id: referralId,
                    amount: awardAmount,
                    date: new Date(),
                };
                // Считаем сколько получил 
                this.balanceAction(referralId, BalanceType.referral_award, awardAmount, BalanceActionType.increase);
                this.referralAwardRepository.save(newReferralAward);
            }
    
            if (referralId) this.addReferralToParent(referralId, amount);
        }

    }

    async getReferralAwards(userId: number) {
        const referralAwards = await this.referralAwardRepository.find({ where: { user_id: userId } });

        return referralAwards.map(({ id, amount, date }) => ({ id, amount, date }));
    }
}
