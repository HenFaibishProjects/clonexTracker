import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import * as crypto from 'crypto';

export interface TrackingData {
    path: string;
    referrer?: string;
    userAgent: string;
    ip: string;
    country: string;
    /** Persistent anonymous browser identifier from localStorage (may be undefined for old clients) */
    anonymous_visitor_id?: string;
}

/** Allowed period values for the analytics read endpoint */
export type AnalyticsPeriod = 'today' | '7d' | '14d' | '30d' | 'all';

@Injectable()
export class AnalyticsService {
    private readonly pool: Pool;
    private readonly logger = new Logger(AnalyticsService.name);

    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    }

    async recordPageView(data: TrackingData): Promise<void> {
        // 1. Bot filtering
        if (/bot|crawler|spider|crawling|curl|postman/i.test(data.userAgent)) {
            return;
        }

        // 2. Create the unique hash without saving IP
        const today = new Date().toISOString().split('T')[0];
        const salt = process.env.HASH_SALT || 'lida_secret_salt';

        const visitorHash = crypto
            .createHash('sha256')
            .update(`${data.ip}-${data.userAgent}-${today}-${salt}`)
            .digest('hex');

        // 3. Write to the database
        const query = `
            INSERT INTO page_views (path, referrer, country, visitor_hash, anonymous_visitor_id)
            VALUES ($1, $2, $3, $4, $5)
        `;
        const values = [data.path, data.referrer || null, data.country, visitorHash, data.anonymous_visitor_id || null];

        try {
            await this.pool.query(query, values);
        } catch (error) {
            // Log to NestJS instead of throwing 500 error to the client
            this.logger.error('Failed to insert page view to DB', error);
        }
    }

    /**
     * Returns page_views rows filtered by the requested time period.
     * Rows are returned newest-first, capped at 500 rows to avoid
     * overwhelming the dashboard on busy sites.
     */
    async getViews(period: AnalyticsPeriod = '7d'): Promise<any[]> {
        // Map period key → Postgres interval expression
        const intervalMap: Record<AnalyticsPeriod, string | null> = {
            today: "date_trunc('day', NOW())",   // midnight today (server TZ)
            '7d':  "NOW() - INTERVAL '7 days'",
            '14d': "NOW() - INTERVAL '14 days'",
            '30d': "NOW() - INTERVAL '30 days'",
            all:   null,                          // no date filter
        };

        const since = intervalMap[period] ?? intervalMap['7d'];

        const query = since
            ? `SELECT id, path, referrer, country, visitor_hash, anonymous_visitor_id, created_at
               FROM page_views
               WHERE created_at >= ${since}
               ORDER BY created_at DESC
               LIMIT 500`
            : `SELECT id, path, referrer, country, visitor_hash, anonymous_visitor_id, created_at
               FROM page_views
               ORDER BY created_at DESC
               LIMIT 500`;

        try {
            const result = await this.pool.query(query);
            return result.rows;
        } catch (error) {
            this.logger.error('Failed to query page views from DB', error);
            throw error;
        }
    }
}