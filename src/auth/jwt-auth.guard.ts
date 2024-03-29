import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private jwtService: JwtService) {}

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const req = context.switchToHttp().getRequest();
        try {
            const accessToken = req.headers['token'];

            if (!accessToken) {
                throw new UnauthorizedException({
                    message: 'Пользователь не авторизован',
                });
            }

            const user = this.jwtService.verify(accessToken);
            req.user = user;
            return true;
        } catch (e) {
            throw new UnauthorizedException({
                message: 'Пользователь не авторизован',
            });
        }
    }
}
