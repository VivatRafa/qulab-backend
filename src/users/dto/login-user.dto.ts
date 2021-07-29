import { IsEmail, IsString, Length } from 'class-validator';

export class LoginUserDto {
    @IsString({ message: 'Должно быть строкой' })
    @IsEmail({}, { message: 'Некорректный email' })
    readonly email: string;

    @IsString({ message: 'Пароль должен быть строкой' })
    @Length(8, 16, { message: 'Пароль должен содержать не меньше 4 и не больше 16 символов' })
    readonly password: string;

    readonly referralId?: string;
}
