import {Controller, Post, Body, Get, Delete} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {LearningProgress} from "./learning-progress.entity";


@Controller('progress')
export class LearningProgressController {
    constructor(
        @InjectRepository(LearningProgress)
        private readonly repo: Repository<LearningProgress>,
    ) {}

    @Post('update')
    async updateProgress(@Body() body: { task_id: string; completed: boolean }) {
        const existing = await this.repo.findOne({ where: { task_id: body.task_id } });
        if (existing) {
            existing.completed = body.completed;
            existing.updated_at = new Date();
            await this.repo.save(existing);
        } else {
            await this.repo.save(this.repo.create(body));
        }
        return { success: true };
    }

    @Get()
    async getAll() {
        return await this.repo.find();
    }

    @Delete('reset')
    async resetAll() {
        await this.repo.clear();
        return { success: true };
    }

}
