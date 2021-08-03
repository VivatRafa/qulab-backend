import { User } from './../../users/entities/user.entity';
import { Column, Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';

@Entity()
export class Balance {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    balance: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    invested: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    withdrawn: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    referral: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    referral_award: number;
}
