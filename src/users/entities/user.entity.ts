import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    login: string;

    @Column()
    email: string;

    @Column()
    password: string;

    @Column()
    last_aсtivity: Date;
    
    @Column()
    registration_date: Date;
    
    @Column()
    status_id: number;

    @Column()
    award_id: number;
    
    @Column({ default: null })
    name?: string;

    @Column({ default: null })
    country?: string;

    @Column({ default: null })
    referral_id?: number;
}
