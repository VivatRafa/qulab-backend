import { User } from '../../users/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentActionStatus } from '../enums/paymentStatus.entity';

@Entity()
export class Receiver {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @Column()
    withdrawId: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    commission: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    receiveAmount: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    amount: number;

    @Column()
    address: string;
}
