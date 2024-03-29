import { User } from '../../users/entities/user.entity';
import { Column, Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';

@Entity()
export class ReferralAward {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    amount: number;

    @Column()
    date: Date;
}
