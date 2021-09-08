import { BalanceService } from './../balance/balance.service';
import { Balance } from './../balance/entities/balance.entity';
import { User } from './entities/user.entity';
import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePassDto } from './dto/change-pass.dto';
import { FindOneOptions, In, Repository } from 'typeorm';
import { PurseService } from '../purse/purse.service';
import { user as userConfig } from '../config/user';
import { statusType } from './types/userStatus';
import { BalanceType } from '../balance/enum/balanceType.enum';
import { BalanceActionType } from '../balance/enum/balanceActionType.enum';
import Big from 'big.js';

@Injectable()
export class UsersService {
    basicStatusId: number;
    basicAwardId: number;

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @Inject(forwardRef(() => BalanceService))
        private balanceService: BalanceService,
        private purseService: PurseService,
    ) {
        this.basicStatusId = 1;
        this.basicAwardId = 0;

    }

    async getUserInfo(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        const purse = await this.purseService.getPurseByParams({ where: { user_id: userId } })

        const userInfo = {
            ...user,
            address: purse?.address || '',
        }
        delete userInfo.password;

        return userInfo;
    }

    async createUser(сreateUserDto: CreateUserDto) {
        const newUser: Omit<User, 'id'> = {
            ...сreateUserDto,
            referral_id: сreateUserDto.referralId,
            last_aсtivity: new Date(),
            registration_date: new Date(),
            status_id: this.basicStatusId,
            award_id: this.basicAwardId,
        };

        try {
            const user: User = await this.userRepository.save(newUser);
            return user;
        } catch (e) {
            console.error(e);
        }
    }

    async updateUser(userId, updatedInfo: UpdateUserDto) {
        await this.userRepository.update(userId, updatedInfo);

        return { success: true };
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

    
    // async getRecursiveStructure(ids, refLines) {
    //     const idsExist = ids.length;

    //     if (idsExist) {
    //         const result = await ids.reduce(async (acc) => {
    //             const downReferrals = await this.userRepository.find({ where: { referral_id: In(ids) } });
    //             const downReferralsIds = downReferrals.map(({ id }) => id);
    //             const lineStruct = await this.buildStructureItem(downReferralsIds);
    //             const awaitAcc = (await acc) || [];
    //             awaitAcc.push(lineStruct);

    //             if (downReferralsIds.length) await this.getRecursiveStructure(downReferralsIds, awaitAcc);

    //             return awaitAcc;
    //         }, Promise.resolve(refLines));

    //         return result;
    //     }

    //     return refLines;
    // }

    // переделать рекурсивно
    async getStructure(userId) {
        const firstLineReferralsIds = await this.getDownReferralIds([userId]);
        const secondLineReferralsIds = await this.getDownReferralIds(firstLineReferralsIds);
        const thirdLineReferralsIds = await this.getDownReferralIds(secondLineReferralsIds);
        const fourthLineReferralsIds = await this.getDownReferralIds(thirdLineReferralsIds);
        const fifthLineReferralsIds = await this.getDownReferralIds(fourthLineReferralsIds);

        const result = {
            first: await this.buildStructureItem(firstLineReferralsIds),
            second: await this.buildStructureItem(secondLineReferralsIds),
            third: await this.buildStructureItem(thirdLineReferralsIds),
            fourth: await this.buildStructureItem(fourthLineReferralsIds),
            fifth: await this.buildStructureItem(fifthLineReferralsIds),
        };

        return result;
    }

    async getDownReferralIds(userIds: number[]) {
        const params = { where: { referral_id: In(userIds) } };
        const downReferralUsers = await this.userRepository.find(params);
        const downReferralUserIds = downReferralUsers.map(({ id }) => id);

        return downReferralUserIds;
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

    // async updateAllUsersBonus() {
    //     const users = await this.userRepository.find();

    //     users.forEach(({ id }) => {
    //         this.updateUserStatus(id);
    //         this.updateUserStatus(id);
    //     })
    // }

    async updateUserStatus(userId: number) {
        const { status_id: currentStatusId } = await this.userRepository.findOne({
            where: { id: userId },
        });

        const { referral, invested: currentInvested } = await this.balanceService.getBalanceByParam({
            where: { user_id: userId },
        });

        const { statuses } = userConfig;
        // статусы пользователя
        const { id: matchedStatusId = currentStatusId } = [...statuses].reverse().find(({ invested, referralAmount }) => {
            const isInvestestedMoreThanStatus = Big(currentInvested).gte(Big(invested));
            const isReferralMoreThanStatus = Big(referral).gte(Big(referralAmount));

            return isInvestestedMoreThanStatus && isReferralMoreThanStatus;
        }) || {};

        const isNewStatus = currentStatusId !== matchedStatusId;

        if (isNewStatus) this.userRepository.update(userId, { status_id: matchedStatusId });
    }

    async updateUserAwards(userId: number) {
        const { award_id: currentStatusId } = await this.userRepository.findOne({
            where: { id: userId },
        });

        const { referral, invested: currentInvested } = await this.balanceService.getBalanceByParam({
            where: { user_id: userId },
        });

        const { awards } = userConfig;
        // статусы пользователя
        const { id: matchedAwardId, award } = [...awards].reverse().find(({ invested, allReferralAmount }) => {
            const isInvestestedMoreThanStatus = Big(currentInvested).gte(Big(invested));
            const isReferralMoreThanStatus = Big(referral).gte(Big(allReferralAmount));

            return isInvestestedMoreThanStatus && isReferralMoreThanStatus;
        }) || {};

        const isNewAwardStatus = currentStatusId !== matchedAwardId;

        if (isNewAwardStatus) {
            this.userRepository.update(userId, { award_id: matchedAwardId });
            this.balanceService.balanceAction(userId, BalanceType.balance, award, BalanceActionType.increase);
            this.balanceService.addAward(userId, award);
        }
    }

    getStatusInfo(statusId: number): statusType {
        return userConfig.statuses.find(({ id }) => id === statusId);
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

    async changePassword(userId: number, changePassInfo: ChangePassDto) {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        const isPasswordEquals = await bcrypt.compare(changePassInfo.oldPassword, user.password);

        if (isPasswordEquals) {
            const hashPassword = await bcrypt.hash(changePassInfo.newPassword, 5);
            await this.userRepository.update(user.id, { password: hashPassword });

            return { success: true }
        }

        throw new HttpException('Неправильный пароль', HttpStatus.BAD_REQUEST);
    }

    async getStatuses() {}
}
