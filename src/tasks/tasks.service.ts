import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval, Timeout } from '@nestjs/schedule';
import { DepositeService } from '../deposite/deposite.service';

@Injectable()
export class TasksService {
    constructor(private depositeService: DepositeService) {}

    // каждую полночь
    @Cron('* * * * *')
    handleCron() {
        console.log('asd');
        
        // this.depositeService.updateDepositeAmount();
    }
}
