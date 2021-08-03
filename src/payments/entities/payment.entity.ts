import { User } from './../../users/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentActionStatus } from '../enums/paymentStatus.entity';

@Entity()
export class Payment {
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
    code: string;

    @Column()
    invoice: string;
}
