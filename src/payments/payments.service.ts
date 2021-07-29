import { Withdraw } from './entities/withdraw.entity';
import { domain } from './../config/domain';
import { BalanceType } from './../balance/enum/balanceType.enum';
import { BalanceService } from './../balance/balance.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Balance } from './../balance/entities/balance.entity';
import { Big } from 'big.js';
import { Payment } from './entities/payment.entity';
import { HttpService, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { FindManyOptions, Repository } from 'typeorm';
import { PaymentActionStatus } from './enums/paymentStatus.entity';
import { BalanceActionType } from '../balance/enum/balanceActionType.enum';
import { wallets } from '../config';
import { PaymentActionType } from './enums/paymentType.enum';

type UserPayout = {
    userId: number;
    amount: number;
    address: string;
};

const errorsObj = {
    'invalid amount (to low), receiver list index 0': 'Слишком маленькая сумма',
    'not enough funds': 'Произошла какая-то ошибка, попробуйте позже',
}

@Injectable()
export class PaymentsService {
    sendingInterval: number;
    getDollarToBtcRateInterval: number;
    dollarToBtcRate: number | string;
    payoutQueue: UserPayout[] = [];

    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
        @InjectRepository(Withdraw)
        private readonly withdrawRepository: Repository<Withdraw>,
        private readonly httpService: HttpService,
        private balanceService: BalanceService,
    ) {
        this.getDollarToBtcRateInterval = 60 * 60 * 1000; // час
        this.sendingInterval = 1000 * 60 * 5; // 5 мин
        this.dollarToBtcRate = '0.000027';
        this.init();
    }

    init() {
        this.startIntervalSending();
        this.startGetDollarRateInterval();
    }

    async getDollarToBtcRate() {
        const { data: oneBtcToDollar } = await this.httpService.get('https://blockchain.info/tobtc?currency=USD&value=1').toPromise();
        this.dollarToBtcRate = oneBtcToDollar;
    }

    startGetDollarRateInterval() {
        this.getDollarToBtcRate();

        setInterval(this.getDollarToBtcRate, this.getDollarToBtcRateInterval);
    }

    async createReplenishment(userId: number, amount: number) {
        const url = `${domain.BITAPS_API_BASE_URL}/create/wallet/payment/address`;

        const body = {
            wallet_id: wallets.walletId,
            callback_link: 'http://45.147.177.198:3000/payments/replenishment-callback',
        };

        const { data, status } = await this.httpService.post(url, body).toPromise();

        const isSuccess = status === 200;

        if (!isSuccess) {
            throw new HttpException('Что-то пошло не так, попробуйте позже', HttpStatus.BAD_REQUEST);
        }

        const { address, payment_code, invoice } = data;

        const newPayment: Omit<Payment, 'id'> = {
            user_id: userId,
            date: new Date(),
            status: PaymentActionStatus.inProgress,
            amount,
            code: payment_code,
            invoice,
        };

        await this.paymentRepository.save(newPayment);

        return { address };
    }

    async confirmReplenishment(body) {

        const { event, code, invoice, amount } = body;

        if (event === 'confirmed') {
            const payment = await this.paymentRepository.findOne({ where: { code, invoice } });

            if (payment && payment.status !== PaymentActionStatus.done) {
                try {
                    const bAmount = Big(amount);
                    const btc = bAmount.times(Big(0.00000001));
                    const dollarRateBtc = btc.div(Big(this.dollarToBtcRate)).toNumber();
                    this.paymentRepository.update(payment.id, { amount: dollarRateBtc, status: PaymentActionStatus.done });
                    await this.balanceService.balanceAction(payment.user_id, BalanceType.balance, dollarRateBtc, BalanceActionType.increase);
                } catch (error) {
                    console.log(error);
                }
            }
        }

        return {};
    }

    async withdraw(userId: number, amount: number, address: string) {
        const url = `${domain.BITAPS_API_BASE_URL}/wallet/send/payment/${wallets.walletId}`;

        const bAmount = Big(amount);
        const btcValue = bAmount.times(Big(this.dollarToBtcRate));
        const serviceBtcValue = btcValue.div(Big(0.00000001)).toNumber();

        const body = {
            receivers_list: [
                {
                    address,
                    amount: serviceBtcValue,
                },
            ],
        };

        try {
            const { data, status } = await this.httpService.post(url, body).toPromise();

            const isSuccess = status === 200;

            if (!isSuccess) {
                throw new HttpException('Что-то пошло не так, попробуйте позже', HttpStatus.BAD_REQUEST);
            }

            const { tx_list } = data;
            const [info] = tx_list;

            const { tx_hash } = info;

            const newWithdraw: Omit<Withdraw, 'id'> = {
                user_id: userId,
                status: PaymentActionStatus.inProgress,
                amount: serviceBtcValue,
                date: new Date(),
                address,
                tx_hash,
            };

            await this.withdrawRepository.save(newWithdraw);

            return { success: true };
        } catch (e) {
            console.log(e);
            throw new HttpException('Что-то пошло не так, попробуйте позже', HttpStatus.BAD_REQUEST);
        }
    }

    async confirmWithdraw(body) {
        const { event, tx_hash, address, amount } = body;

        if (event === 'wallet payment confirmed') {
            const bAmount = Big(amount);
            const btc = bAmount.times(Big(0.00000001));
            const dollarRateBtc = btc.div(Big(this.dollarToBtcRate)).toNumber();

            const withdraw = await this.withdrawRepository.findOne({
                where: { tx_hash, address },
            });

            if (withdraw  && withdraw.status !== PaymentActionStatus.done) {
                await this.paymentRepository.update(withdraw.id, { amount: dollarRateBtc, status: PaymentActionStatus.done });
                await this.balanceService.balanceAction(withdraw.user_id, BalanceType.balance, dollarRateBtc, BalanceActionType.decrease);
                await this.balanceService.balanceAction(withdraw.user_id, BalanceType.withdrawn, dollarRateBtc, BalanceActionType.increase);
            }
        }

        return {};
    }

    async getPayments(userId: number) {
        const params = {
            where: {
                user_id: userId,
            },
        };
        const paymentsList = await this.paymentRepository.find(params);

        return paymentsList;
    }

    async getWithdraws(userId: number) {
        const params = {
            where: {
                user_id: userId,
            },
        };
        const withdrawList = await this.getWithdrawsByParams(params);

        return withdrawList;
    }

    async getWithdrawsByParams(param: FindManyOptions<Withdraw>) {
        const withdrawList = await this.withdrawRepository.find(param);

        return withdrawList;
    }

    async getPaymentsBy(params: FindManyOptions<Payment>) {
        const payments = await this.paymentRepository.find(params);

        return payments;
    }

    startIntervalSending() {
        setInterval(this.sendPayouts, this.sendingInterval);
    }

    addPayout(userPayout: UserPayout) {
        this.payoutQueue.push(userPayout);
    }

    sendPayouts() {
        if (!this.payoutQueue?.length) return;
        const walletId = 123;
        const body = {
            receivers_list: this.payoutQueue,
            message: 'message',
        };
        this.httpService.post(`https://api.bitaps.com/btc/v1/wallet/send/payment/${walletId}`, body);
    }
}
