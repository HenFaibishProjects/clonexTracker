import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClonexEntry } from './clonex.entity';

@Injectable()
export class ClonexService {
    constructor(
        @InjectRepository(ClonexEntry)
        private clonexRepo: Repository<ClonexEntry>,
    ) {}

    async addEntry(data: Partial<ClonexEntry>): Promise<ClonexEntry> {
        if (data.takenAt) {
            data.takenAt = new Date(data.takenAt);
        }

        const entry = this.clonexRepo.create(data);
        return this.clonexRepo.save(entry);
    }


    async getAllEntries(): Promise<ClonexEntry[]> {
        return this.clonexRepo
            .createQueryBuilder('entry')
            .orderBy('entry.takenAt', 'DESC')
            .getMany();
    }

    async getBetweenDates(from: string, to: string): Promise<ClonexEntry[]> {
        return this.clonexRepo
            .createQueryBuilder('entry')
            .where('entry.takenAt BETWEEN :from AND :to', { from, to })
            .orderBy('entry.takenAt', 'DESC')
            .getMany();
    }

    async deleteOne(id: number): Promise<void> {
        await this.clonexRepo.delete(id);
    }

    async deleteMany(ids: number[]): Promise<void> {
        await this.clonexRepo.delete(ids);
    }

    async updateOne(id: number, data: Partial<ClonexEntry>): Promise<void> {
        await this.clonexRepo.update(id, data);
    }
}
