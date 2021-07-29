import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { regexp } from '../../config/index';

export class UpdateUserDto {
    @IsEmail({}, { message: 'Некорректный email' })
    readonly email: string;

    @Length(4, 30)
    readonly login: string;
    
    readonly name: string;

    readonly country: string;
}
