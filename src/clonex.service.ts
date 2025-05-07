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

    async addEntry(data: Partial<ClonexEntry>, userId: number): Promise<ClonexEntry> {
        if (data.takenAt) {
            data.takenAt = new Date(data.takenAt);
        }

        const entry = this.clonexRepo.create({
            ...data,
            user: { id: userId },
        });

        return this.clonexRepo.save(entry);
    }

    async getAllEntries(userId: number): Promise<ClonexEntry[]> {
        return this.clonexRepo.find({
            where: { user: { id: userId } },
            order: { takenAt: 'DESC' },
        });
    }

    async getBetweenDates(from: string, to: string, userId: number): Promise<ClonexEntry[]> {
        return this.clonexRepo
            .createQueryBuilder('entry')
            .where('entry.takenAt BETWEEN :from AND :to', { from, to })
            .andWhere('entry.userId = :userId', { userId })
            .orderBy('entry.takenAt', 'DESC')
            .getMany();
    }

    async deleteOne(id: number, userId: number): Promise<void> {
        await this.clonexRepo.delete({ id, user: { id: userId } });
    }

    async deleteMany(ids: number[], userId: number): Promise<void> {
        await this.clonexRepo
            .createQueryBuilder()
            .delete()
            .from(ClonexEntry)
            .whereInIds(ids)
            .andWhere('userId = :userId', { userId })
            .execute();
    }

    async updateOne(id: number, data: Partial<ClonexEntry>, userId: number): Promise<void> {
        await this.clonexRepo.update({ id, user: { id: userId } }, data);
    }
}
