import { BalanceService } from './../balance/balance.service';
import { Balance } from './../balance/entities/balance.entity';
import { CreateUserDto } from './../users/dto/create-user.dto';
import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginUserDto } from '../users/dto';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
    constructor(private userService: UsersService, private jwtService: JwtService, private balanceService: BalanceService) {}

    async login(userDto: LoginUserDto) {
        const user = await this.validateUser(userDto);
        const accessToken = this.generateToken(user);

        return {
            accessToken,
        };
    }

    async registration(userDto: CreateUserDto) {
        const candidate = await this.userService.getUserByParams({ where: { email: userDto.email } });

        if (candidate) throw new HttpException('Пользователь с таким email существует', HttpStatus.BAD_REQUEST);

        const hashPassword = await bcrypt.hash(userDto.password, 5);
        const user = await this.userService.createUser({
            ...userDto,
            password: hashPassword,
        });

        this.balanceService.createBalance(user.id);

        const accessToken = this.generateToken(user);

        return {
            accessToken,
        };
    }

    private generateToken(user: User) {
        const payload = {
            email: user.email,
            id: user.id,
            login: user.login,
            statusId: user.status_id,
        };

        return this.jwtService.sign(payload);
    }

    private async validateUser(userDto: LoginUserDto) {
        const user = await this.userService.getUserByParams({ where: { email: userDto.email } });

        const isPasswordEquals = await bcrypt.compare(userDto?.password, user.password);

        if (user && isPasswordEquals) {
            return user;
        }

        throw new UnauthorizedException({
            message: 'Некорректный емайл или пароль',
        });
    }
}
