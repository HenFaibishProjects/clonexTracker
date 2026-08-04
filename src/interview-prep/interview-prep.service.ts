import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterviewPrepSectionState } from './interview-prep-section-state.entity';
import { InterviewPrepSectionStatus } from './interview-prep-status.enum';
import { CreateSectionStateDto, UpdateSectionStateDto } from './dto';

@Injectable()
export class InterviewPrepService {
    private readonly logger = new Logger(InterviewPrepService.name);

    constructor(
        @InjectRepository(InterviewPrepSectionState)
        private readonly repo: Repository<InterviewPrepSectionState>,
    ) {}

    /**
     * Get all section states, optionally filtered by topicId.
     */
    async findAll(topicId?: string): Promise<InterviewPrepSectionState[]> {
        try {
            if (topicId && typeof topicId === 'string' && topicId.trim().length > 0) {
                return await this.repo.find({
                    where: { topicId: topicId.trim() },
                    order: { createdAt: 'ASC' },
                });
            }
            return await this.repo.find({
                order: { createdAt: 'ASC' },
            });
        } catch (err: any) {
            this.logger.error(`Error retrieving section states: ${err?.message}`, err?.stack);
            throw new InternalServerErrorException('Failed to retrieve section states.');
        }
    }

    /**
     * Get a single section state by topicId and sectionId.
     * Throws 404 if not found.
     */
    async findOne(topicId: string, sectionId: string): Promise<InterviewPrepSectionState> {
        this.validateTopicAndSection(topicId, sectionId);
        const cleanTopicId = topicId.trim();
        const cleanSectionId = sectionId.trim();

        let state: InterviewPrepSectionState | null = null;
        try {
            state = await this.repo.findOne({
                where: { topicId: cleanTopicId, sectionId: cleanSectionId },
            });
        } catch (err: any) {
            this.logger.error(`Error finding section state: ${err?.message}`, err?.stack);
            throw new InternalServerErrorException('Failed to retrieve section state.');
        }

        if (!state) {
            throw new NotFoundException(
                `Section state not found for topic "${cleanTopicId}" and section "${cleanSectionId}".`,
            );
        }

        return state;
    }

    /**
     * Create a single section state.
     * Throws 409 if topicId + sectionId combination already exists.
     */
    async create(dto: CreateSectionStateDto): Promise<InterviewPrepSectionState> {
        this.validateTopicAndSection(dto.topicId, dto.sectionId);
        const topicId = dto.topicId.trim();
        const sectionId = dto.sectionId.trim();

        // Check if existing
        let existing: InterviewPrepSectionState | null = null;
        try {
            existing = await this.repo.findOne({
                where: { topicId, sectionId },
            });
        } catch (err: any) {
            this.logger.error(`Error checking existing section state: ${err?.message}`, err?.stack);
            throw new InternalServerErrorException('Failed to validate section state uniqueness.');
        }

        if (existing) {
            throw new ConflictException(
                `Section state already exists for topic "${topicId}" and section "${sectionId}".`,
            );
        }

        try {
            const entity = this.repo.create({
                topicId,
                sectionId,
                status: dto.status ?? InterviewPrepSectionStatus.IN_PROGRESS,
                note: dto.note ?? '',
                lastVisitedAt: null,
            });
            return await this.repo.save(entity);
        } catch (err: any) {
            if (err?.code === '23505') {
                throw new ConflictException(
                    `Section state already exists for topic "${topicId}" and section "${sectionId}".`,
                );
            }
            this.logger.error(`Error creating section state: ${err?.message}`, err?.stack);
            throw new InternalServerErrorException('Failed to create section state.');
        }
    }

    /**
     * Partially update or create a section state (upsert).
     * If the row exists, updates only received fields.
     * If the row does not exist, creates it with default status 'in-progress' and note ''.
     * If visited is true, sets lastVisitedAt to current server time.
     */
    async upsert(
        topicId: string,
        sectionId: string,
        dto: UpdateSectionStateDto,
    ): Promise<InterviewPrepSectionState> {
        this.validateTopicAndSection(topicId, sectionId);
        const cleanTopicId = topicId.trim();
        const cleanSectionId = sectionId.trim();

        try {
            let entity = await this.repo.findOne({
                where: { topicId: cleanTopicId, sectionId: cleanSectionId },
            });

            if (entity) {
                if (dto.status !== undefined) {
                    entity.status = dto.status;
                }
                if (dto.note !== undefined) {
                    entity.note = dto.note;
                }
                if (dto.visited === true) {
                    entity.lastVisitedAt = new Date();
                }
            } else {
                entity = this.repo.create({
                    topicId: cleanTopicId,
                    sectionId: cleanSectionId,
                    status: dto.status ?? InterviewPrepSectionStatus.IN_PROGRESS,
                    note: dto.note ?? '',
                    lastVisitedAt: dto.visited === true ? new Date() : null,
                });
            }

            return await this.repo.save(entity);
        } catch (err: any) {
            this.logger.error(`Error upserting section state: ${err?.message}`, err?.stack);
            throw new InternalServerErrorException('Failed to save section state.');
        }
    }

    /**
     * Delete one section state.
     * Returns 404 if not found.
     */
    async deleteSection(topicId: string, sectionId: string): Promise<void> {
        this.validateTopicAndSection(topicId, sectionId);
        const cleanTopicId = topicId.trim();
        const cleanSectionId = sectionId.trim();

        let existing: InterviewPrepSectionState | null = null;
        try {
            existing = await this.repo.findOne({
                where: { topicId: cleanTopicId, sectionId: cleanSectionId },
            });
        } catch (err: any) {
            this.logger.error(`Error querying section state for deletion: ${err?.message}`, err?.stack);
            throw new InternalServerErrorException('Failed to query section state.');
        }

        if (!existing) {
            throw new NotFoundException(
                `Section state not found for topic "${cleanTopicId}" and section "${cleanSectionId}".`,
            );
        }

        try {
            await this.repo.remove(existing);
        } catch (err: any) {
            this.logger.error(`Error deleting section state: ${err?.message}`, err?.stack);
            throw new InternalServerErrorException('Failed to delete section state.');
        }
    }

    /**
     * Delete all section states for a topic.
     * Returns { deleted: count }.
     */
    async deleteByTopic(topicId: string): Promise<{ deleted: number }> {
        if (!topicId || typeof topicId !== 'string' || !topicId.trim() || topicId.trim().length > 100) {
            throw new BadRequestException('topicId must be a non-empty string with maximum length 100.');
        }
        const cleanTopicId = topicId.trim();

        try {
            const result = await this.repo.delete({ topicId: cleanTopicId });
            return { deleted: result.affected ?? 0 };
        } catch (err: any) {
            this.logger.error(`Error deleting section states by topic: ${err?.message}`, err?.stack);
            throw new InternalServerErrorException('Failed to delete section states for topic.');
        }
    }

    /**
     * Helper validation for topicId and sectionId.
     */
    private validateTopicAndSection(topicId?: string, sectionId?: string): void {
        if (!topicId || typeof topicId !== 'string' || !topicId.trim() || topicId.trim().length > 100) {
            throw new BadRequestException('topicId must be a non-empty string with maximum length 100.');
        }
        if (sectionId !== undefined) {
            if (!sectionId || typeof sectionId !== 'string' || !sectionId.trim() || sectionId.trim().length > 150) {
                throw new BadRequestException('sectionId must be a non-empty string with maximum length 150.');
            }
        }
    }
}
