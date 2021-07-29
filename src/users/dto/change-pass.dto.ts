import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { regexp } from '../../config/index';

export class ChangePassDto {
    @Matches(regexp.password, { message: 'Пароль должен содержать хотя бы 1 цифру, символ в нижнем регистре, в верхнем регистре и быть не меньше 8 и не больше 16 в длину' })
    readonly newPassword: string;

    @Matches(regexp.password, { message: 'Пароль должен содержать хотя бы 1 цифру, символ в нижнем регистре, в верхнем регистре и быть не меньше 8 и не больше 16 в длину' })
    readonly oldPassword: string;
}
