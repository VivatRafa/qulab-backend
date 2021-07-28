import { DepositeModule } from './../deposite/deposite.module';
import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';

@Module({
    imports: [DepositeModule],
    providers: [TasksService],
})
export class TasksModule {}
