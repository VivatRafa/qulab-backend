import { BalanceService } from './../balance/balance.service';
import { Balance } from './../balance/entities/balance.entity';
import { User } from './entities/user.entity';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateUserDto } from './dto/create-user.dto';
import { FindOneOptions, In, Repository } from 'typeorm';
import { UserStatus } from './entities/userStatus.entity';

@Injectable()
export class UsersService {
    basicStatusId: number;

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(UserStatus)
        private readonly userStatusRepository: Repository<UserStatus>,
        @Inject(forwardRef(() => BalanceService))
        private balanceService: BalanceService,
    ) {
        this.basicStatusId = 1;
    }

    async getUserInfo(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        delete user.password;

        return user;
    }

    async createUser(сreateUserDto: CreateUserDto) {
        const newUser: Omit<User, 'id'> = {
            ...сreateUserDto,
            referral_id: сreateUserDto.referralId,
            last_aсtivity: new Date(),
            registration_date: new Date(),
            status_id: this.basicStatusId,
        };

        try {
            const user: User = await this.userRepository.save(newUser);
            return user;
        } catch (e) {
            console.log(e);
        }
    }

    async getAllUsers() {
        const users = await this.userRepository.find();
        return users;
    }

    async getUserByParams(params: FindOneOptions<User>) {
        const user = await this.userRepository.findOne(params);
        return user;
    }

    async getUsersByParams(params: FindOneOptions<User>) {
        const user = await this.userRepository.findOne(params);
        return user;
    }

    async getReferralsInfo(userId) {
        const firstLineReferrals = await this.userRepository.find({ where: { referral_id: userId } });
        const referralIds = firstLineReferrals.map((user) => user.id);
        const referralsBalance = await this.balanceService.getBalancesByParam({ where: { user_id: In(referralIds) } });
        const activeReferrals = referralsBalance.filter((balance) => balance.balance > 0);

        const referralCounts = referralIds.length;
        const activeReferralCounts = activeReferrals.length;
        return { referralCounts, activeReferralCounts };
    }

    async getStructure(userId) {
        const referralsFirstLine = await this.userRepository.find({ where: { referral_id: userId } });
        const firstLineReferralsIds = referralsFirstLine.map((user) => user.id);

        const referralsSecondLine = await this.userRepository.find({ where: { referral_id: In(firstLineReferralsIds) } });
        const secondLineReferralsIds = referralsSecondLine.map((user) => user.id);

        const referralsThirdLine = await this.userRepository.find({ where: { referral_id: In(secondLineReferralsIds) } });
        const thirdLineReferralsIds = referralsThirdLine.map((user) => user.id);

        const referralsFourthLine = await this.userRepository.find({ where: { referral_id: In(thirdLineReferralsIds) } });
        const fourthLineReferralsIds = referralsFourthLine.map((user) => user.id);

        const result = {
            first: await this.buildStructureItem(firstLineReferralsIds),
            second: await this.buildStructureItem(secondLineReferralsIds),
            third: await this.buildStructureItem(thirdLineReferralsIds),
            fourth: await this.buildStructureItem(fourthLineReferralsIds),
        };

        return result;
    }

    async buildStructureItem(userIds: number[]) {
        const list = await Promise.all(
            userIds.map(async (id) => {
                const { login } = await this.userRepository.findOne({ where: { id } });
                const { balance } = await this.balanceService.getBalanceByParam({ where: { user_id: id } });
                return { id, login, balance };
            }),
        );

        return list;
    }

    async updateUserStatus(userId: number) {
        const { status_id: currentStatusId } = await this.userRepository.findOne({
            where: { user_id: userId },
        });

        const userBalance = await this.balanceService.getBalanceByParam({
            where: { user_id: userId },
        });

        const userStatuses = await this.userStatusRepository.find();

        const currentStatus = userStatuses.find(({ id }) => id === currentStatusId);
        // TODO Как только буду известны числа, можно будет знать как отсортировать неподходящие статусы
        // Нужно выбрать только те статусы, суммы которых больше и выбртаь первую
        const higherUserStatuses = userStatuses.filter(({ id }) => id !== currentStatusId);

        const { id: newStatusId } = higherUserStatuses.find((status) => {
            // const isAmountHighrer = status.amount > currentStatus.amount;
            // const isRefAmountHighrer =
            //     status.ref_amount > currentStatus.ref_amount;
            return status;
        });

        if (!newStatusId) return;

        this.userRepository.update(userId, { status_id: newStatusId });
    }

    async getTopReferrals() {
        const topReferralsBalances = await this.balanceService.getBalancesByParam({
            order: { referral: 'DESC' },
            take: 5,
        });

        const topReferrals = await Promise.all(
            topReferralsBalances.map(async (balance) => {
                const { login } = await this.userRepository.findOne({ where: { id: balance.user_id } });

                return { name: login, amount: balance.referral };
            }),
        );

        return topReferrals;
    }

    async getStatuses() {}
}
