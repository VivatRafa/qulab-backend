import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class DepositeTariff {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    day_rate: string;

    @Column()
    amount: string;

    @Column()
    time_limit: string;
}
