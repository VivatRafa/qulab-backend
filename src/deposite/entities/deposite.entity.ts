import { PaymentActionStatus } from '../../payments/enums/paymentStatus.entity';
import { User } from '../../users/entities/user.entity';
import { Column, Entity, PrimaryGeneratedColumn, OneToOne } from 'typeorm';

@Entity()
export class Deposite {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @Column()
    date: Date;

    @Column()
    amount: number;

    @Column()
    profit: number;

    @Column()
    tariff_id: number;

    @Column()
    status: PaymentActionStatus;
}
