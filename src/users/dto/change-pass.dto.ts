import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { regexp } from '../../config/index';

export class ChangePassDto {
    @Length(4, 30, { message: 'Пароль должен быть не меньше 8 и не больше 16 в длину' })
    readonly newPassword: string;

    @Length(4, 30, { message: 'Пароль должен быть не меньше 8 и не больше 16 в длину' })
    readonly oldPassword: string;
}
