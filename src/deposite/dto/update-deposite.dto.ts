import { PartialType } from '@nestjs/mapped-types';
import { CreateDepositeDto } from './create-deposite.dto';

export class UpdateDepositeDto extends PartialType(CreateDepositeDto) {}
