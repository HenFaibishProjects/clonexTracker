import { Controller, Post, Get, Body, Req, Query, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { AnalyticsService, AnalyticsPeriod } from './analytics.service';
import { TrackPageViewDto } from './analytics.dto';

const VALID_PERIODS: AnalyticsPeriod[] = ['today', '7d', '14d', '30d', 'all'];

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    /** POST /api/analytics/track — record a page view */
    @Post('track')
    async trackPage(@Body() body: TrackPageViewDto, @Req() req: Request) {
        // Extract data injected from Frontend and infrastructure (Cloudflare)
        const userAgent = req.headers['user-agent'] || '';
        const ip = (req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'] || req.ip || 'unknown') as string;
        const country = (req.headers['cf-ipcountry'] || 'XX') as string;

        // Pass to business logic
        await this.analyticsService.recordPageView({
            path: body.path,
            referrer: body.referrer,
            userAgent,
            ip,
            country
        });

        // Always return success so the client is not blocked
        return { status: 'success' };
    }

    /**
     * GET /api/analytics/views?period=7d
     * Supported periods: today | 7d | 14d | 30d | all
     * Returns page_view rows sorted newest-first (max 500).
     */
    @Get('views')
    async getViews(@Query('period') period: string = '7d') {
        if (!VALID_PERIODS.includes(period as AnalyticsPeriod)) {
            throw new BadRequestException(
                `Invalid period "${period}". Use one of: ${VALID_PERIODS.join(', ')}`
            );
        }
        return this.analyticsService.getViews(period as AnalyticsPeriod);
    }
}