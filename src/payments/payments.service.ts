import { Withdraw } from './entities/withdraw.entity';
import { PaymentRequest } from './entities/paymentRequest.entity';
import { domain } from './../config/domain';
import { BalanceType } from './../balance/enum/balanceType.enum';
import { BalanceService } from './../balance/balance.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Balance } from './../balance/entities/balance.entity';
import { Big } from 'big.js';
import { Payment } from './entities/payment.entity';
import { HttpService, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PaymentActionStatus } from './enums/paymentStatus.entity';
import { BalanceActionType } from '../balance/enum/balanceActionType.enum';
import { wallets } from '../config';
import { PaymentActionType } from './enums/paymentType.enum';

type UserPayout = {
    userId: number;
    amount: number;
    address: string;
};

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
        @InjectRepository(PaymentRequest)
        private readonly paymentRequestRepository: Repository<PaymentRequest>,
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
            callback_link: 'https://webhook.site/d40467c8-28f7-4a58-88e0-033824dc9f7e',
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

            if (payment) {
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
                    address: 'mpMsgAybHWxPhS88a19Uf83YuN5Uabu6Up',
                    amount: serviceBtcValue,
                },
            ],
        };

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

            if (withdraw) {
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
        const withdrawList = await this.withdrawRepository.find(params);

        return withdrawList;
    }

    async getPaymentsBy(params) {
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
