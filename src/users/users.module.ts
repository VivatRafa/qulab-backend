import { BalanceModule } from './../balance/balance.module';
import { Balance } from './../balance/entities/balance.entity';
import { User } from './entities/user.entity';
import { forwardRef, Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStatus } from './entities/userStatus.entity';

@Module({
    controllers: [UsersController],
    providers: [UsersService],
    imports: [TypeOrmModule.forFeature([User, UserStatus]), forwardRef(() => AuthModule), forwardRef(() => BalanceModule)],
    exports: [UsersService],
})
export class UsersModule {}