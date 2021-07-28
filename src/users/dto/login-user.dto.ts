import { IsEmail, IsString, Length } from 'class-validator';

export class LoginUserDto {
    @IsString({ message: 'Должно быть строкой' })
    @IsEmail({}, { message: 'Некорректный email' })
    readonly email: string;

    @IsString({ message: 'Должно быть строкой' })
    @Length(8, 16, { message: 'Не меньше 4 и не больше 16' })
    readonly password: string;

    readonly referralId?: string;
}
