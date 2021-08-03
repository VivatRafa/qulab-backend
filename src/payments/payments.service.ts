import { Withdraw } from './entities/withdraw.entity';
import { domain } from './../config/domain';
import { BalanceType } from './../balance/enum/balanceType.enum';
import { BalanceService } from './../balance/balance.service';
import { InjectRepository } from '@nestjs/typeorm';
import { payment as paymentConfig } from './../config/payment';
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
        this.getDollarToBtcRateInterval = 60 * 60 * 1000; // час 60 * 60 * 1000;
        this.sendingInterval = 1000 * 60 * 5; // 5 мин
        this.dollarToBtcRate = '0.000027';

        this.init();
    }

    init() {
        this.startIntervalSending();
        this.startGetDollarRateInterval();
    }

    async getDollarToBtcRate() {
        const { data: oneBtcToDollar, status } = await this.httpService.get('https://blockchain.info/tobtc?currency=USD&value=1').toPromise();

        if (status === 200) this.dollarToBtcRate = oneBtcToDollar;
    }

    startGetDollarRateInterval() {
        this.getDollarToBtcRate();

        setInterval(this.getDollarToBtcRate, this.getDollarToBtcRateInterval);
    }

    async createReplenishment(userId: number, amount: number) {
        const url = `${domain.BITAPS_API_TESTNET_BASE_URL}/create/wallet/payment/address`;

        const body = {
            wallet_id: wallets.testWalletId,
            callback_link: 'http://45.147.177.198:3001/payments/replenishment-callback',
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
                    // btc = (bAmount * oneSatoshi) - comission
                    const btc = bAmount.times(Big(paymentConfig.oneSatoshi)).minus(Big(paymentConfig.bitaps.comisson.replenish));
                    const dollarRateBtc = btc.div(Big(this.dollarToBtcRate)).toNumber();

                    this.paymentRepository.update(payment.id, { amount: dollarRateBtc, status: PaymentActionStatus.done });

                    await this.balanceService.balanceAction(payment.user_id, BalanceType.balance, dollarRateBtc, BalanceActionType.increase);

                    this.balanceService.addReferralToParent(payment.user_id, dollarRateBtc);

                } catch (error) {
                    console.log(error);
                }
            }
        }

        return {};
    }

    async withdraw(userId: number, amount: number, address: string) {
        if (typeof amount !== 'number') 
            throw new HttpException('Сумма должна быть числом', HttpStatus.BAD_REQUEST);

        const bAmount = Big(amount);
        const btcAmount = bAmount.times(Big(this.dollarToBtcRate));

        const isAmountLessThanComission = btcAmount.lt(Big(paymentConfig.bitaps.comisson.withdraw));
        // holdAmount
        if (isAmountLessThanComission) 
            throw new HttpException('Минимальная сумма выплаты 25 QU', HttpStatus.BAD_REQUEST);
        
        const url = `${domain.BITAPS_API_TESTNET_BASE_URL}/wallet/send/payment/${wallets.testWalletId}`;

        const serviceBtcValue = btcAmount.div(Big(paymentConfig.oneSatoshi)).toNumber();

        const body = {
            receivers_list: [
                {
                    address,
                    amount: serviceBtcValue,
                },
            ],
        };

        try {
            const resp = await this.httpService.post(url, body).toPromise();
            const { data, status } = resp;
            
            
            const isSuccess = status === 200;

            if (!isSuccess) {
                const errorMessage = data?.message;
                throw new HttpException('Что-то пошло не так, попробуйте позже', HttpStatus.BAD_REQUEST);
            }

            const { tx_list } = data;
            const [info] = tx_list;

            const { tx_hash } = info;

            const newWithdraw: Omit<Withdraw, 'id'> = {
                user_id: userId,
                status: PaymentActionStatus.inProgress,
                amount: bAmount.toNumber(),
                date: new Date(),
                address,
                tx_hash,
            };

            // холдировать сумму
            await this.withdrawRepository.save(newWithdraw);            

            return { success: true };
        } catch (e) {
            console.log();
            const errorMessage = errorsObj[e.response?.data?.message] || 'Что-то пошло не так, попробуйте позже';
            throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
        }
    }

    async confirmWithdraw(body) {
        const { event, tx_hash, address, amount } = body;

        if (event === 'wallet payment confirmed') {
            // Выведенная из кошелька сумма
            const bigAmount = Big(amount);
            // один сатоши 0.00000001
            const bigOneSatoshi = Big(paymentConfig.oneSatoshi);
            // Курс доллара
            const bigDollarRate = Big(this.dollarToBtcRate);
            // комиссия сервиса 0.0006
            const bigWithdrawComission = Big(paymentConfig.bitaps.comisson.withdraw);
            // Выведенная сумма в BTC (100 000 satoshi * 0.00000001 one satoshi = 0.001 BTC)
            const bigBtcAmount = bigAmount.times(bigOneSatoshi);
            // Выведенная сумма с учетом комиссии (0.001 BTC - 0.0006 BTC = 0.0004 BTC)
            const bigBtcAmountMinusComission = bigBtcAmount.minus(bigWithdrawComission);
            // Выведенная сумма с учетом комиссии в долларах (начислить user'у) (0.0004 BTC / 0.000027 (1 dollar rate to BTC) = ~14.81 USD)
            const dollarRateBtc = bigBtcAmountMinusComission.div(bigDollarRate).toNumber();

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
