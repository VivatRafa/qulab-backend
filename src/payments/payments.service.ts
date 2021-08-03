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
import { HoldActionType } from 'src/balance/enum/holdActionType.enum';

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

    validateReplenishAmount(amount: number) {
        let errorMessage = '';

        const amountNotNumber = typeof amount !== 'number';
        
        if (amountNotNumber) errorMessage = 'Сумма должна быть числом';

        
        const isLessThanMin = amount < paymentConfig.min.replenish;

        if (isLessThanMin) errorMessage = `Минимальная сумма пополнения ${paymentConfig.min.replenish} QU`;

        // если сообщений нет, значит всё ок
        const isValid = !errorMessage;

        return { isValid, errorMessage };
    }

    async createReplenishment(userId: number, amount: number) {
        const { isValid, errorMessage } = this.validateReplenishAmount(amount);

        if (!isValid) throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);

        const url = `${domain.BITAPS_API_TESTNET_BASE_URL}/create/wallet/payment/address`;

        const body = {
            wallet_id: wallets.testWalletId,
            callback_link: 'http://45.147.177.198:3001/payments/replenishment-callback',
        };

        const { data, status } = await this.httpService.post(url, body).toPromise();

        const isSuccess = status === 200;

        if (!isSuccess) throw new HttpException('Что-то пошло не так, попробуйте позже', HttpStatus.BAD_REQUEST);

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
                    const usdAmount = this.fromSatoshiToQu(amount);
                    const usdComission = this.fromSatoshiToQu(paymentConfig.bitaps.comisson.replenish);

                    const bigUsdAmount = Big(usdAmount);
                    const bigUsdComission = Big(usdComission);

                    const resultAmount = bigUsdAmount.minus(bigUsdComission).toNumber();

                    this.paymentRepository.update(payment.id, { amount: resultAmount, status: PaymentActionStatus.done });

                    await this.balanceService.balanceAction(payment.user_id, BalanceType.balance, resultAmount, BalanceActionType.increase);
                } catch (error) {
                    console.log(error);
                }
            }
        }

        return {};
    }

    fromQuToSatoshi(amount: number) {
        // 100 USD
        const bigAmount = Big(amount);
        // 1 USD = 0.000027 BTC
        const bigDollarToBtcRate = Big(this.dollarToBtcRate);
        // 100 USD * 0.000027 BTC = 0.0027 BTC
        const bigBtcAmount = bigAmount.times(bigDollarToBtcRate);
        // 0.00000001 BTC = 1 satoshi
        const bigOneSatoshi = Big(paymentConfig.oneSatoshi);
        // 0.0026 BTC / 0.00000001 BTC (1 satoshi) = 260000 satoshi
        const serviceBtcValue = bigBtcAmount.div(bigOneSatoshi).toNumber();
        // 260000 satoshi
        return serviceBtcValue;
    }

    fromSatoshiToQu(amount: number | string) {
        // 260000 satoshi
        const bigAmount = Big(amount);
        // 0.00000001 BTC = 1 satoshi
        const bigOneSatoshi = Big(paymentConfig.oneSatoshi);
        // 1 dollar = 0.000027 BTC
        const bigDollarToBtcRate = Big(this.dollarToBtcRate);
        // 260000 satoshi * 0.00000001 BTC (1 satoshi) = 0.0026 BTC
        const bigBtcAmount = bigAmount.times(bigOneSatoshi);
        // 0.0026 BTC / 0.000027 BTC (1 USD) = 100 USD
        const usdAmount = bigBtcAmount.div(bigDollarToBtcRate).toNumber();

        return usdAmount
    }

    async validateWithdrawAmount(userId: number, amount: number) {
        let errorMessage = '';

        const amountNotNumber = typeof amount !== 'number';
        
        if (amountNotNumber) errorMessage = 'Сумма должна быть числом';

        const bigAmount = Big(amount);

        const { balance } = await this.balanceService.getBalanceByParam({ where: { user_id: userId } });
        
        const bigBalance = Big(balance);
        const isLessThanBalance = bigAmount.lt(bigBalance);

        if (isLessThanBalance) errorMessage = 'Недостаточно средств на вашем счету';

        const btcAmount = bigAmount.times(Big(this.dollarToBtcRate));
        const isAmountLessThanComission = btcAmount.lt(Big(paymentConfig.bitaps.comisson.withdraw));

        if (isAmountLessThanComission) errorMessage = 'Минимальная сумма выплаты 25 QU';

        // если сообщений нет, значит всё ок
        const isValid = !errorMessage;

        return { isValid, errorMessage };
    }

    async withdraw(userId: number, amount: number, address: string) {
        const { isValid, errorMessage } = await this.validateWithdrawAmount(userId, amount);

        if (!isValid) throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
        
        const url = `${domain.BITAPS_API_TESTNET_BASE_URL}/wallet/send/payment/${wallets.testWalletId}`;

        const serviceBtcValue = this.fromQuToSatoshi(amount);

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
                throw new HttpException('Что-то пошло не так, попробуйте позже', HttpStatus.BAD_REQUEST);
            }

            // список транзакции
            const { tx_list } = data;
            // берем первый из списка
            const [transactionInfo] = tx_list;
            // tx_hash хэш транзакции
            const { tx_hash } = transactionInfo;

            const newWithdraw: Omit<Withdraw, 'id'> = {
                user_id: userId,
                status: PaymentActionStatus.inProgress,
                amount,
                date: new Date(),
                address,
                tx_hash,
            };

            await this.balanceService.holdAmountAction(userId, amount, HoldActionType.hold);
            await this.withdrawRepository.save(newWithdraw);            

            return { success: true };
        } catch (e) {
            const errorMessage = errorsObj[e.response?.data?.message] || 'Что-то пошло не так, попробуйте позже';
            throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
        }
    }

    async confirmWithdraw(body) {
        const { event, tx_hash, address, amount } = body;

        if (event === 'wallet payment confirmed') {
            const usdAmount = this.fromSatoshiToQu(amount);
            const usdComission = this.fromSatoshiToQu(paymentConfig.bitaps.comisson.withdraw);

            const bigUsdAmount = Big(usdAmount);
            const bigUsdComission = Big(usdComission);

            const resultAmount = bigUsdAmount.minus(bigUsdComission).toNumber();

            const withdraw = await this.withdrawRepository.findOne({
                where: { tx_hash, address },
            });

            const userId = withdraw.user_id;

            if (withdraw  && withdraw.status !== PaymentActionStatus.done) {
                // обновляем статус и сумму запроса на вывод средств
                await this.paymentRepository.update(withdraw.id, { amount: resultAmount, status: PaymentActionStatus.done });
                // Уменьшаем баланс пользователя
                await this.balanceService.balanceAction(userId, BalanceType.balance, resultAmount, BalanceActionType.decrease);
                // Увеличиваем выведенное количество денег
                await this.balanceService.balanceAction(userId, BalanceType.withdrawn, resultAmount, BalanceActionType.increase);
                // уберем с hold выведенное значение
                await this.balanceService.holdAmountAction(userId, amount, HoldActionType.hold);
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
