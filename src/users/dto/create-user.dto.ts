import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { regexp } from '../../config/index';

export class CreateUserDto {
    @IsEmail()
    readonly email: string;

    @Length(4, 30)
    readonly login: string;

    @Length(8, 16)
    @Matches(regexp.password)
    readonly password: string;

    readonly referralId?: number;
}
