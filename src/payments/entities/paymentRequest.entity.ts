import { User } from './../../users/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentActionStatus } from '../enums/paymentStatus.entity';

@Entity()
export class PaymentRequest {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @Column()
    date: Date;

    @Column()
    amount: number;

    @Column()
    invoice: string;

    @Column()
    code: string;
}
