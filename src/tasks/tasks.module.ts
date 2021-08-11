import { DepositeModule } from './../deposite/deposite.module';
import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [DepositeModule, UsersModule],
    providers: [TasksService],
})
export class TasksModule {}
