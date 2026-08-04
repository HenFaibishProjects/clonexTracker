import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { InterviewPrepService } from './interview-prep.service';
import { CreateSectionStateDto, UpdateSectionStateDto } from './dto';
import { InterviewPrepSectionState } from './interview-prep-section-state.entity';

@Controller('interview-prep')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class InterviewPrepController {
    constructor(private readonly interviewPrepService: InterviewPrepService) {}

    /**
     * 1. Get all section states
     * GET /interview-prep/sections
     * Optional filter: GET /interview-prep/sections?topicId=java
     */
    @Get('sections')
    async getAllSections(
        @Query('topicId') topicId?: string,
    ): Promise<InterviewPrepSectionState[]> {
        return this.interviewPrepService.findAll(topicId);
    }

    /**
     * 2. Get one section state
     * GET /interview-prep/topics/:topicId/sections/:sectionId
     * Returns 404 when not found.
     */
    @Get('topics/:topicId/sections/:sectionId')
    async getOneSection(
        @Param('topicId') topicId: string,
        @Param('sectionId') sectionId: string,
    ): Promise<InterviewPrepSectionState> {
        return this.interviewPrepService.findOne(topicId, sectionId);
    }

    /**
     * 3. Create one section state
     * POST /interview-prep/sections
     * Returns 409 when topicId + sectionId already exists.
     */
    @Post('sections')
    @HttpCode(HttpStatus.CREATED)
    async createSection(
        @Body() dto: CreateSectionStateDto,
    ): Promise<InterviewPrepSectionState> {
        return this.interviewPrepService.create(dto);
    }

    /**
     * 4. Partially update or create a section state
     * PATCH /interview-prep/topics/:topicId/sections/:sectionId
     */
    @Patch('topics/:topicId/sections/:sectionId')
    async patchSection(
        @Param('topicId') topicId: string,
        @Param('sectionId') sectionId: string,
        @Body() dto: UpdateSectionStateDto,
    ): Promise<InterviewPrepSectionState> {
        return this.interviewPrepService.upsert(topicId, sectionId, dto);
    }

    /**
     * 5. Delete one section state
     * DELETE /interview-prep/topics/:topicId/sections/:sectionId
     * Returns 204 when deleted, 404 when not found.
     */
    @Delete('topics/:topicId/sections/:sectionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteSection(
        @Param('topicId') topicId: string,
        @Param('sectionId') sectionId: string,
    ): Promise<void> {
        await this.interviewPrepService.deleteSection(topicId, sectionId);
    }

    /**
     * 6. Delete all section states for a topic
     * DELETE /interview-prep/topics/:topicId
     * Returns { deleted: number }
     */
    @Delete('topics/:topicId')
    async deleteTopicSections(
        @Param('topicId') topicId: string,
    ): Promise<{ deleted: number }> {
        return this.interviewPrepService.deleteByTopic(topicId);
    }
}
