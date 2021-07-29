import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { regexp } from '../../config/index';

export class CreateUserDto {
    @IsEmail({}, { message: 'Некорректный email' })
    readonly email: string;

    @Length(4, 30)
    readonly login: string;

    @Matches(regexp.password, { message: 'Пароль должен содержать хотя бы 1 цифру, символ в нижнем регистре, в верхнем регистре и быть не меньше 8 и не больше 16 в длину' })
    readonly password: string;

    readonly referralId?: number;
}
