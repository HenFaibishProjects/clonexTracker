import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BenzosEntry } from './benzos.entity';
import {User} from "./auth/user.entity";

@Injectable()
export class BenzosService {
    constructor(
        @InjectRepository(BenzosEntry)
        private benzosEntryRepository: Repository<BenzosEntry>,
        @InjectRepository(User)
        private userRepo: Repository<User>
    ) {}

    async changeName(newName: string, userId: number) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        user.userName = newName;
        return this.userRepo.save(user);
    }

    async addEntry(data: Partial<BenzosEntry>, userId: number): Promise<BenzosEntry> {
        if (data.takenAt) {
            data.takenAt = new Date(data.takenAt);
        }

        const entry = this.benzosEntryRepository.create({
            ...data,
            user: { id: userId },
        });

        return this.benzosEntryRepository.save(entry);
    }

    async getAllEntries(userId: number): Promise<BenzosEntry[]> {
        return this.benzosEntryRepository.find({
            where: { user: { id: userId } },
            order: { takenAt: 'DESC' },
        });
    }

    async getBetweenDates(from: string, to: string, userId: number): Promise<BenzosEntry[]> {
        return this.benzosEntryRepository
            .createQueryBuilder('entry')
            .where('entry.takenAt BETWEEN :from AND :to', { from, to })
            .andWhere('entry.userId = :userId', { userId })
            .orderBy('entry.takenAt', 'DESC')
            .getMany();
    }

    async deleteOne(id: number, userId: number): Promise<void> {
        await this.benzosEntryRepository.delete({ id, user: { id: userId } });
    }

    async deleteMany(ids: number[], userId: number): Promise<void> {
        await this.benzosEntryRepository
            .createQueryBuilder()
            .delete()
            .from(BenzosEntry)
            .whereInIds(ids)
            .andWhere('userId = :userId', { userId })
            .execute();
    }

    async updateOne(id: number, data: Partial<BenzosEntry>, userId: number): Promise<void> {
        await this.benzosEntryRepository.update({ id, user: { id: userId } }, data);
    }

    async changeBenzosType(newBenzosType: string, userId: number) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        user.benzosType = newBenzosType;
        return this.userRepo.save(user);
    }
}
