import { User } from './user.entity';
import { Column, Entity, PrimaryGeneratedColumn, OneToOne } from 'typeorm';

@Entity()
export class UserStatus {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    amount: number;

    @Column()
    ref_amount: number;

    @Column()
    bonus: number;

    @OneToOne(() => User, (user) => user)
    status: User;
}
