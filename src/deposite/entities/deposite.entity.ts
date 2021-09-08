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

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    profit: number;

    @Column()
    tariff_id: number;

    @Column()
    status: PaymentActionStatus;
}
