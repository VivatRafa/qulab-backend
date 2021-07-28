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

const referralAwards = [0.01, 0.02, 0.03, 0.04, 0.05];

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
            referral_award: 0,
        };

        await this.balanceRepository.save(emptyBalance);
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
        const user = await this.userService.getUserByParams({ where: { id: userId } });

        const increaseValue = Big(amount);
        const oldValue = Big(currentBalance[balanceType]);
        const newValue =
            actionType === BalanceActionType.increase ? oldValue.plus(increaseValue).toNumber() : oldValue.minus(increaseValue).toNumber();

        this.balanceRepository.update(currentBalance.id, { [balanceType]: newValue });

        // Добавляем реферальный оборот структуры рефералу
        if (balanceType === BalanceType.balance && user.referral_id) {
            this.addReferralToParent(user.referral_id, increaseValue.toNumber());
        }
    }

    async addReferralToParent(userId: number, amount: number, referralLevel = 1) {
        const { id, referral_id } = await this.userService.getUserByParams({ where: { id: userId } });
        this.balanceAction(id, BalanceType.referral, amount, BalanceActionType.increase);
        const referralAward = referralAwards[referralLevel - 1];

        if (referralLevel && referralAward) {
            const awardAmount = Big(amount).times(Big(referralAward)).toNumber();
            this.balanceAction(id, BalanceType.balance, awardAmount, BalanceActionType.increase);
            const newReferralAward: Omit<ReferralAward, 'id'> = {
                user_id: id,
                award: awardAmount,
                date: new Date(),
            };

            this.balanceAction(id, BalanceType.referral_award, awardAmount, BalanceActionType.increase);
            this.referralAwardRepository.save(newReferralAward);
        }

        if (referral_id) this.addReferralToParent(referral_id, amount, referralLevel + 1);
    }

    async getReferralAwards(userId: number) {
        const referralAwards = await this.referralAwardRepository.find({ where: { user_id: userId } });

        return referralAwards.map(({ id, award, date }) => ({ id, award, date }));
    }
}
