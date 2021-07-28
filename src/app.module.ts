import { TasksModule } from './tasks/tasks.module';
import { User } from './users/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { DepositeModule } from './deposite/deposite.module';
import { PaymentsModule } from './payments/payments.module';
import { BalanceModule } from './balance/balance.module';
import { AuthModule } from './auth/auth.module';
import { PurseModule } from './purse/purse.module';
import { OperationsModule } from './operations/operations.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: `.${process.env.NODE_ENV}.env`,
        }),
        TypeOrmModule.forRoot({
            type: 'mysql',
            host: process.env.MYSQL_HOST,
            port: Number(process.env.MYSQL_PORT),
            username: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DB,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
        }),
        UsersModule,
        BalanceModule,
        AuthModule,
        PaymentsModule,
        DepositeModule,
        TasksModule,
        PurseModule,
        OperationsModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
