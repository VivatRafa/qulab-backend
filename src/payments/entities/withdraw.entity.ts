import { User } from '../../users/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentActionStatus } from '../enums/paymentStatus.entity';

@Entity()
export class Withdraw {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @Column()
    date: Date;

    @Column()
    status: PaymentActionStatus;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    amount: number;

    @Column()
    tx_hash: string;

    @Column()
    address: string;
}
