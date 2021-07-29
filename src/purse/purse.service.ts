import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { Purse } from './entity/purse.entity';

@Injectable()
export class PurseService {
    constructor(
        @InjectRepository(Purse)
        private readonly purseRepository: Repository<Purse>,
    ) {}

    async addPurse(userId: number, address: string) {
        const purse = await this.purseRepository.findOne({ where: { user_id: userId } });

        if (purse) {
            await this.purseRepository.update(purse.id, { address });
        } else {
            const newPurse: Omit<Purse, 'id'> = {
                user_id: userId,
                address,
            }
    
            this.purseRepository.save(newPurse);
        }

        return { success: true };

    }

    async getPurseByParams(params: FindOneOptions<Purse>) {
        const purse = await this.purseRepository.findOne(params);

        return purse;
    }
}
