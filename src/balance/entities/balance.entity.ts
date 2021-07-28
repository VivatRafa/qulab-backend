import { User } from './../../users/entities/user.entity';
import { Column, Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';

@Entity()
export class Balance {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @Column()
    balance: number;

    @Column()
    invested: number;

    @Column()
    withdrawn: number;

    @Column()
    referral: number;

    @Column()
    referral_award: number;
}
