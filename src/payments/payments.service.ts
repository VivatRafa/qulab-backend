import { Withdraw } from './entities/withdraw.entity';
import { domain } from './../config/domain';
import { BalanceType } from './../balance/enum/balanceType.enum';
import { BalanceService } from './../balance/balance.service';
import { InjectRepository } from '@nestjs/typeorm';
import { payment as paymentConfig } from './../config/payment';
import { Balance } from './../balance/entities/balance.entity';
import { Big } from 'big.js';
import { Payment } from './entities/payment.entity';
import { HttpService, Injectable, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { FindManyOptions, Repository } from 'typeorm';
import { PaymentActionStatus } from './enums/paymentStatus.entity';
import { BalanceActionType } from '../balance/enum/balanceActionType.enum';
import { wallets } from '../config';
import { PaymentActionType } from './enums/paymentType.enum';
import { HoldActionType } from '../balance/enum/holdActionType.enum';
import { Receiver } from './entities/receiver.entity';

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
        @InjectRepository(Receiver)
        private readonly receiverRepository: Repository<Receiver>,
        private readonly httpService: HttpService,
        @Inject(forwardRef(() => BalanceService))
        private balanceService: BalanceService,
    ) {
        this.getDollarToBtcRateInterval = 60 * 60 * 1000; // час 60 * 60 * 1000;
        this.sendingInterval = 1000 * 60 * 5; // 5 мин
        this.dollarToBtcRate = '0.00002181';

        this.init();
    }

    init() {
        this.startGetDollarRateInterval();
    }

    getDollarToBtcRate = async () => {
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
            callback_link: 'https://qulab.club/api/payments/replenishment-callback',
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
                    console.error(error);
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
        const isLessThanBalance = bigBalance.lt(bigAmount);

        if (isLessThanBalance) errorMessage = 'Недостаточно средств на вашем счету';

        const { withdraw: minWithdrawAmount } = paymentConfig.min;

        const isAmountLessThanComission = bigAmount.lt(Big(minWithdrawAmount));

        if (isAmountLessThanComission) errorMessage = `Минимальная сумма выплаты ${minWithdrawAmount} QU`;

        // если сообщений нет, значит всё ок
        const isValid = !errorMessage;

        return { isValid, errorMessage };
    }

    async withdraw(userId: number, amount: number, address: string) {
        const { isValid, errorMessage } = await this.validateWithdrawAmount(userId, amount);

        if (!isValid) throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);

        const { commissions } = paymentConfig;
        const { commission: commissionProcent } = [...commissions].reverse().find(({ from, to }) => {
            return from <= amount && amount <= to;
        });

        const satoshiAmount = Big(this.fromQuToSatoshi(amount));
        const bigComissionProcent = Big(commissionProcent);
        const bigCommission = satoshiAmount.times(bigComissionProcent);

        const receiveAmount = satoshiAmount.minus(bigCommission).toNumber();
        const bigAmount = Big(amount);

        const usdAmount = bigAmount.minus(bigAmount.times(bigComissionProcent)).toNumber();

        const newWithdraw: Omit<Withdraw, 'id'> = {
            user_id: userId,
            status: PaymentActionStatus.inProgress,
            amount: usdAmount,
            date: new Date(),
            address,
        };

        await this.balanceService.holdAmountAction(userId, usdAmount, HoldActionType.hold);
        const { id: withdrawId } = await this.withdrawRepository.save(newWithdraw);

        const receiver: Omit<Receiver, 'id'> = {
            receiveAmount,
            amount: usdAmount,
            user_id: userId,
            commission: bigCommission.toNumber(),
            address,
            withdrawId,
        };

        await this.receiverRepository.save(receiver);

        this.sendPayouts();

        return { success: true };
    }

    async confirmWithdraw(body) {
        const { event, tx_hash, address, amount } = body;
        
        if (event === 'wallet payment confirmed') {
            const usdAmount = this.fromSatoshiToQu(amount);

            const withdraw = await this.withdrawRepository.findOne({
                where: { tx_hash, address },
            });

            if (!withdraw) return;
            
            const amountWithoutComission = withdraw.amount;

            const userId = withdraw.user_id;

            if (withdraw  && withdraw.status !== PaymentActionStatus.done) {
                // Уменьшаем баланс пользователя
                await this.balanceService.balanceAction(userId, BalanceType.balance, amountWithoutComission, BalanceActionType.decrease);
                // Увеличиваем выведенное количество денег
                await this.balanceService.balanceAction(userId, BalanceType.withdrawn, amountWithoutComission, BalanceActionType.increase);
                // обновляем статус и сумму запроса на вывод средств
                await this.withdrawRepository.update(withdraw.id, { amount: usdAmount, status: PaymentActionStatus.done });
                // уберем с hold выведенное значение
                await this.balanceService.holdAmountAction(userId, amountWithoutComission, HoldActionType.unhold);
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
    async sendPayouts() {
        const receivers = await this.receiverRepository.find();
        const comissionAmount = receivers.reduce((acc, { commission }) => Big(acc).plus(Big(commission)).toNumber(), 0);
        const { firstUser, additionalUser } = paymentConfig.bitaps.comisson.withdraw;

        const bigFirstUserCommission = Big(firstUser);
        const bigAdditionalUserCommission = Big(additionalUser);
        const bigReceiversCount = Big(receivers.length)
        const bitapsCommission = bigFirstUserCommission.plus(bigAdditionalUserCommission.times(bigReceiversCount)).toNumber();
        
        if (comissionAmount < bitapsCommission) return;

        const receivers_list = receivers.map(({ address, receiveAmount }) => ({ address, amount: Number(receiveAmount) }));
        const body = {
            receivers_list,
            message: {
                format: "text",
                payload: 'message',
            },
        };
        const url = `${domain.BITAPS_API_TESTNET_BASE_URL}/wallet/send/payment/${wallets.testWalletId}`;

        try {
            const resp = await this.httpService.post(url, body).toPromise();
            const { data, status } = resp;
            
            const isSuccess = status === 200;

            if (!isSuccess) {
                throw new HttpException('Что-то пошло не так, попробуйте позже', HttpStatus.BAD_REQUEST);
            }

            const receiverIds = receivers.map(({ id }) => id);

            await this.receiverRepository.delete(receiverIds);

            // список транзакции
            const { tx_list } = data;

            tx_list.forEach(async ({ tx_hash, amount }, index) => {
                const { withdrawId, receiveAmount } = receivers[index];

                await this.withdrawRepository.update(withdrawId, { tx_hash });
            })

        } catch (e) {
            console.error(e);
        }
    }

    getDollarRate() {
        return { dollarRate: this.dollarToBtcRate };
    }
}
