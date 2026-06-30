import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    BadRequestException,
    UnprocessableEntityException
} from '@nestjs/common';
import { VectorService } from './vector.service';

@Controller('vector')
export class VectorController {
    constructor(private readonly vectorService: VectorService) {}

    @Post('compare')
    async compare(
        @Body() body: any
    ) {
        // 1. Validate request shape and value types
        if (!body || typeof body !== 'object') {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Invalid request body shape.',
                error: 'Bad Request'
            });
        }

        const { textA, textB } = body;

        if (textA === undefined || textA === null || textB === undefined || textB === null) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Both textA and textB are required.',
                error: 'Bad Request'
            });
        }

        if (typeof textA !== 'string' || typeof textB !== 'string') {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Both textA and textB must be strings.',
                error: 'Bad Request'
            });
        }

        const normA = textA.trim().replace(/\s+/g, ' ');
        const normB = textB.trim().replace(/\s+/g, ' ');

        if (normA.length === 0 || normB.length === 0) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Both textA and textB must not be empty after trim.',
                error: 'Bad Request'
            });
        }

        if (normA.length > 1000 || normB.length > 1000) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Text length must not exceed 1000 characters.',
                error: 'Bad Request'
            });
        }

        // 2. Perform compare operation
        const result = this.vectorService.compare(normA, normB);

        if (!result) {
            // Fetch a few diverse examples to return in the 422 error response
            const sampleExamples = this.vectorService.getExamples(undefined, undefined, 5)
                .map(ex => ({
                    textA: ex.textA,
                    textB: ex.textB,
                    category: ex.category,
                    relation: ex.relation
                }));

            throw new UnprocessableEntityException({
                error: {
                    code: 'UNSUPPORTED_DEMO_PAIR',
                    message: 'This demo currently supports predefined educational examples only.',
                    details: 'Try one of the supported examples below.'
                },
                supportedExamples: sampleExamples
            });
        }

        return result;
    }

    @Get('examples')
    async getExamples(
        @Query('category') category?: string,
        @Query('relation') relation?: string,
        @Query('limit') limit?: string
    ) {
        let limitNum = 50; // Default limit

        if (limit !== undefined && limit !== '') {
            const parsed = parseInt(limit, 10);
            if (isNaN(parsed) || parsed <= 0) {
                throw new BadRequestException({
                    statusCode: 400,
                    message: 'Limit must be a positive integer.',
                    error: 'Bad Request'
                });
            }
            if (parsed > 200) {
                throw new BadRequestException({
                    statusCode: 400,
                    message: 'Limit cannot exceed 200.',
                    error: 'Bad Request'
                });
            }
            limitNum = parsed;
        }

        return this.vectorService.getExamples(category, relation, limitNum);
    }

    @Get('categories')
    async getCategories() {
        return this.vectorService.getCategories();
    }
}
