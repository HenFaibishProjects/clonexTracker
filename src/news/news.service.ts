import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import { NewsItem } from './entities/news-item.entity';
import { Feed } from './entities/feed.entity';
import { Topic } from './entities/topic.entity';
import { CreateNewsItemDto } from './dto/create-news-item.dto';
import { UpdateNewsItemDto } from './dto/update-news-item.dto';
import { NewsImageService } from './news-image.service';

function getJerusalemSunday(): string {
  const jerusalemStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
  const jerusalemDate = new Date(jerusalemStr);
  jerusalemDate.setHours(0, 0, 0, 0);
  const day = jerusalemDate.getDay();
  jerusalemDate.setDate(jerusalemDate.getDate() - day);

  const yyyy = jerusalemDate.getFullYear();
  const mm = String(jerusalemDate.getMonth() + 1).padStart(2, '0');
  const dd = String(jerusalemDate.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

export interface FindAllFilters {
  feedId?: string;
  category?: string;
  location?: string;
  displayWeekStart?: string | Date;
}

export interface FindCurrentWeekFilters {
  feedCode?: string;
  category?: string;
  location?: string;
}

export interface SearchFilters {
  q: string;
  feedCode?: string;
  category?: string;
  location?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsItem)
    private readonly newsItemRepo: Repository<NewsItem>,
    @InjectRepository(Feed)
    private readonly feedRepo: Repository<Feed>,
    @InjectRepository(Topic)
    private readonly topicRepo: Repository<Topic>,
    private readonly newsImageService: NewsImageService,
  ) {}

  async ensureFeed(code: string, name: string, description?: string): Promise<Feed> {
    const existing = await this.feedRepo.findOne({ where: { code } });
    if (existing) {
      return existing;
    }

    const feed = this.feedRepo.create({
      code,
      name,
      description,
      isActive: true,
    });

    try {
      return await this.feedRepo.save(feed);
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('duplicate key value')) {
        const concurrentFeed = await this.feedRepo.findOne({ where: { code } });
        if (concurrentFeed) {
          return concurrentFeed;
        }
      }
      throw error;
    }
  }

  async findCurrentWeek(filters: FindCurrentWeekFilters = {}): Promise<NewsItem[]> {
    if (filters.feedCode === 'romania') {
      const feed = await this.feedRepo.findOne({ where: { code: filters.feedCode } });
      if (!feed) {
        throw new NotFoundException(`Feed with code ${filters.feedCode} not found`);
      }

      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const qb = this.newsItemRepo
        .createQueryBuilder('newsItem')
        .leftJoinAndSelect('newsItem.feed', 'feed')
        .leftJoinAndSelect('newsItem.topics', 'topics')
        .where('newsItem.isActive = :isActive', { isActive: true })
        .andWhere('newsItem.feedId = :feedId', { feedId: feed.id })
        .andWhere('newsItem.publishedAt >= :fortyEightHoursAgo', { fortyEightHoursAgo })
        .andWhere(
          '(newsItem.importanceScore >= :minImportance OR newsItem.personalScore >= :minPersonal)',
          { minImportance: 3, minPersonal: 4 },
        );

      if (filters.category) {
        qb.andWhere('newsItem.category = :category', { category: filters.category });
      }
      if (filters.location) {
        qb.andWhere('newsItem.location = :location', { location: filters.location });
      }

      const items = await qb
        .orderBy('newsItem.isFeatured', 'DESC')
        .addOrderBy('newsItem.importanceScore', 'DESC')
        .addOrderBy('newsItem.personalScore', 'DESC')
        .addOrderBy('newsItem.publishedAt', 'DESC')
        .getMany();

      return items
        .filter(item => this.isPublishableItem(item))
        .slice(0, 15);
    }

    if (filters.feedCode === 'technology') {
      const feed = await this.feedRepo.findOne({ where: { code: filters.feedCode } });
      if (!feed) {
        throw new NotFoundException(`Feed with code ${filters.feedCode} not found`);
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const qb = this.newsItemRepo
        .createQueryBuilder('newsItem')
        .leftJoinAndSelect('newsItem.feed', 'feed')
        .leftJoinAndSelect('newsItem.topics', 'topics')
        .where('newsItem.isActive = :isActive', { isActive: true })
        .andWhere('newsItem.feedId = :feedId', { feedId: feed.id })
        .andWhere('newsItem.publishedAt >= :sevenDaysAgo', { sevenDaysAgo });

      if (filters.category) {
        qb.andWhere('newsItem.category = :category', { category: filters.category });
      }
      if (filters.location) {
        qb.andWhere('newsItem.location = :location', { location: filters.location });
      }

      const items = await qb
        .orderBy('newsItem.isFeatured', 'DESC')
        .addOrderBy('newsItem.importanceScore', 'DESC')
        .addOrderBy('newsItem.publishedAt', 'DESC')
        .getMany();

      return items.filter(item => this.isPublishableItem(item));
    }

    const sunday = getJerusalemSunday();
    const where: FindOptionsWhere<NewsItem> = {
      isActive: true,
      displayWeekStart: sunday,
    };

    if (filters.feedCode) {
      const feed = await this.feedRepo.findOne({ where: { code: filters.feedCode } });
      if (!feed) {
        throw new NotFoundException(`Feed with code ${filters.feedCode} not found`);
      }
      where.feedId = feed.id;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.location) {
      where.location = filters.location;
    }

    const items = await this.newsItemRepo.find({
      where,
      order: {
        isFeatured: 'DESC',
        importanceScore: 'DESC',
        publishedAt: 'DESC',
      },
      relations: ['feed', 'topics'],
    });

    return items.filter(item => this.isPublishableItem(item));
  }

  async getDashboard() {
    const feedDefinitions = [
      { code: 'romania', label: 'רומניה', freshnessTargetHours: 8 },
      { code: 'israel', label: 'ישראל', freshnessTargetHours: 8 },
      { code: 'technology', label: 'טכנולוגיה', freshnessTargetHours: 72 },
    ];

    const feedResults = await Promise.all(
      feedDefinitions.map(async definition => {
        try {
          return {
            ...definition,
            items: await this.findCurrentWeek({ feedCode: definition.code }),
          };
        } catch {
          return { ...definition, items: [] as NewsItem[] };
        }
      }),
    );

    const now = Date.now();
    const allItems = feedResults.flatMap(result => result.items);
    const timestampOf = (item: NewsItem) => {
      const value = item.publishedAt || item.collectedAt || item.createdAt;
      const timestamp = value ? new Date(value).getTime() : 0;
      return Number.isFinite(timestamp) ? timestamp : 0;
    };

    const feeds = feedResults.map(result => {
      const sourceCounts = new Map<string, number>();
      for (const item of result.items) {
        const source = (item.sourceName || 'Unknown').trim();
        sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
      }

      const rankedSources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]);
      const dominantSource = rankedSources[0]?.[0] || null;
      const dominantCount = rankedSources[0]?.[1] || 0;
      const dominantShare = result.items.length
        ? Math.round((dominantCount / result.items.length) * 100)
        : 0;
      const latestPublishedAtMs = result.items.reduce(
        (latest, item) => Math.max(latest, timestampOf(item)),
        0,
      );
      const latestAgeHours = latestPublishedAtMs
        ? (now - latestPublishedAtMs) / (60 * 60 * 1000)
        : Number.POSITIVE_INFINITY;
      const fresh3h = result.items.filter(
        item => now - timestampOf(item) <= 3 * 60 * 60 * 1000,
      ).length;

      let health: 'good' | 'watch' | 'low' = 'low';
      if (result.items.length > 0) {
        const diversityHealthy = sourceCounts.size >= Math.min(3, result.items.length);
        if (
          latestAgeHours <= result.freshnessTargetHours &&
          diversityHealthy &&
          dominantShare <= 65
        ) {
          health = 'good';
        } else if (
          latestAgeHours <= result.freshnessTargetHours * 2 &&
          sourceCounts.size >= Math.min(2, result.items.length) &&
          dominantShare <= 82
        ) {
          health = 'watch';
        }
      }

      return {
        code: result.code,
        label: result.label,
        storyCount: result.items.length,
        sourceCount: sourceCounts.size,
        fresh3h,
        latestPublishedAt: latestPublishedAtMs
          ? new Date(latestPublishedAtMs).toISOString()
          : null,
        dominantSource,
        dominantShare,
        health,
      };
    });

    const topicCounts = new Map<string, { code: string; name: string; count: number }>();
    for (const item of allItems) {
      const seen = new Set<string>();
      const candidates = [
        ...(item.topics || []).map(topic => ({ code: topic.code, name: topic.name })),
        item.companyTopic
          ? { code: item.companyTopic.toLowerCase().replace(/\s+/g, '-'), name: item.companyTopic }
          : null,
      ].filter(Boolean) as Array<{ code: string; name: string }>;

      for (const candidate of candidates) {
        const key = candidate.code.toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const current = topicCounts.get(key);
        if (current) current.count += 1;
        else topicCounts.set(key, { ...candidate, count: 1 });
      }
    }

    const trending = [...topicCounts.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 7);

    const highlightScore = (item: NewsItem) => {
      const publishedAt = timestampOf(item);
      const ageHours = publishedAt ? Math.max(0, (now - publishedAt) / 3600000) : 96;
      return (
        Number(item.importanceScore || 0) * 7 +
        Number(item.personalScore || 0) * 2.5 +
        (item.isFeatured ? 10 : 0) +
        Math.max(0, 18 - ageHours)
      );
    };

    const highlights = [...allItems]
      .sort((a, b) => highlightScore(b) - highlightScore(a))
      .slice(0, 18)
      .map(item => ({
        id: item.id,
        titleHe: item.titleHe,
        summaryHe: item.summaryHe,
        sourceName: item.sourceName,
        imageUrl: item.imageUrl,
        publishedAt: item.publishedAt || item.collectedAt || item.createdAt,
        importanceScore: item.importanceScore,
        personalScore: item.personalScore,
        isFeatured: item.isFeatured,
        feedCode: item.feed?.code || '',
      }));

    const uniqueSources = new Set(
      allItems.map(item => (item.sourceName || '').trim().toLowerCase()).filter(Boolean),
    );

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        stories: allItems.length,
        sources: uniqueSources.size,
        fresh3h: allItems.filter(item => now - timestampOf(item) <= 3 * 60 * 60 * 1000).length,
        stories24h: allItems.filter(item => now - timestampOf(item) <= 24 * 60 * 60 * 1000).length,
      },
      feeds,
      trending,
      highlights,
    };
  }

  async search(filters: SearchFilters): Promise<NewsItem[]> {
    const qb = this.newsItemRepo.createQueryBuilder('newsItem')
      .leftJoinAndSelect('newsItem.feed', 'feed')
      .leftJoinAndSelect('newsItem.topics', 'topics')
      .where('newsItem.isActive = :isActive', { isActive: true });

    if (filters.feedCode) {
      const feed = await this.feedRepo.findOne({ where: { code: filters.feedCode } });
      if (!feed) {
        throw new NotFoundException(`Feed with code ${filters.feedCode} not found`);
      }
      qb.andWhere('newsItem.feedId = :feedId', { feedId: feed.id });
    }
    if (filters.category) {
      qb.andWhere('newsItem.category = :category', { category: filters.category });
    }
    if (filters.location) {
      qb.andWhere('newsItem.location = :location', { location: filters.location });
    }
    if (filters.from) {
      qb.andWhere('newsItem.publishedAt >= :from', { from: filters.from });
    }
    if (filters.to) {
      qb.andWhere('newsItem.publishedAt <= :to', { to: filters.to });
    }
    if (filters.q) {
      qb.andWhere(
        `to_tsvector('simple', coalesce(newsItem.titleHe, '') || ' ' || coalesce(newsItem.originalTitle, '') || ' ' || coalesce(newsItem.summaryHe, '') || ' ' || coalesce(newsItem.companyTopic, '') || ' ' || coalesce(newsItem.category, '') || ' ' || coalesce(newsItem.location, '')) @@ plainto_tsquery('simple', :q)`,
        { q: filters.q }
      );
    }

    qb.orderBy('newsItem.publishedAt', 'DESC');
    const items = await qb.getMany();
    return items.filter(item => this.isPublishableItem(item));
  }

  async create(data: CreateNewsItemDto): Promise<NewsItem> {
    // Avoid fetching source metadata for rows that are already in the archive.
    // Preserve the same PostgreSQL-style duplicate signal expected by the importer.
    const existing = await this.newsItemRepo.findOne({
      where: { sourceUrl: data.sourceUrl },
      select: ['id'],
    });
    if (existing) {
      const duplicateError: any = new Error('duplicate key value violates unique constraint');
      duplicateError.code = '23505';
      throw duplicateError;
    }

    const { topicCodes, feedCode, ...restData } = data;

    const feed = await this.feedRepo.findOne({ where: { code: feedCode } });
    if (!feed) {
      throw new NotFoundException(`Feed with code ${feedCode} not found`);
    }

    let topics: Topic[] = [];
    if (topicCodes && topicCodes.length > 0) {
      topics = await this.topicRepo.find({
        where: { code: In(topicCodes) },
      });
      if (topics.length !== topicCodes.length) {
        const foundCodes = topics.map(t => t.code);
        const missingCodes = topicCodes.filter(c => !foundCodes.includes(c));
        throw new BadRequestException(`One or more topics not found: ${missingCodes.join(', ')}`);
      }
    }

    const resolvedImageUrl = restData.imageUrl ||
      await this.newsImageService.resolveImageUrl(restData.sourceUrl);

    const newItem = this.newsItemRepo.create({
      ...restData,
      imageUrl: resolvedImageUrl,
      imageLookupAttemptedAt: new Date(),
      feed,
      topics,
    });

    return this.newsItemRepo.save(newItem);
  }

  async findAll(filters: FindAllFilters = {}): Promise<NewsItem[]> {
    const where: FindOptionsWhere<NewsItem> = {
      isActive: true,
    };

    if (filters.feedId) {
      where.feedId = filters.feedId;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.location) {
      where.location = filters.location;
    }
    if (filters.displayWeekStart) {
      where.displayWeekStart = filters.displayWeekStart;
    }

    const items = await this.newsItemRepo.find({
      where,
      order: {
        isFeatured: 'DESC',
        importanceScore: 'DESC',
        publishedAt: 'DESC',
      },
      relations: ['feed', 'topics'],
    });

    return items.filter(item => this.isPublishableItem(item));
  }

  async findOne(id: string): Promise<NewsItem> {
    const item = await this.newsItemRepo.findOne({
      where: { id },
      relations: ['feed', 'topics'],
    });

    if (!item || !this.isPublishableItem(item)) {
      throw new NotFoundException(`NewsItem with ID ${id} not found`);
    }

    return item;
  }

  async update(id: string, data: UpdateNewsItemDto): Promise<NewsItem> {
    const item = await this.newsItemRepo.findOne({
      where: { id },
      relations: ['feed', 'topics'],
    });

    if (!item) {
      throw new NotFoundException(`NewsItem with ID ${id} not found`);
    }

    const { topicCodes, feedCode, ...scalarFields } = data;

    if (feedCode && feedCode !== item.feed?.code) {
      const feed = await this.feedRepo.findOne({ where: { code: feedCode } });
      if (!feed) {
        throw new NotFoundException(`Feed with code ${feedCode} not found`);
      }
      item.feed = feed;
      item.feedId = feed.id;
    }

    if (topicCodes !== undefined) {
      if (topicCodes.length > 0) {
        const topics = await this.topicRepo.find({
          where: { code: In(topicCodes) },
        });
        if (topics.length !== topicCodes.length) {
          const foundCodes = topics.map(t => t.code);
          const missingCodes = topicCodes.filter(c => !foundCodes.includes(c));
          throw new BadRequestException(`One or more topics not found: ${missingCodes.join(', ')}`);
        }
        item.topics = topics;
      } else {
        item.topics = [];
      }
    }

    Object.assign(item, scalarFields);

    return this.newsItemRepo.save(item);
  }

  async remove(id: string): Promise<NewsItem> {
    const item = await this.newsItemRepo.findOne({
      where: { id },
      relations: ['feed', 'topics'],
    });

    if (!item) {
      throw new NotFoundException(`NewsItem with ID ${id} not found`);
    }

    item.isActive = false;
    return this.newsItemRepo.save(item);
  }

  private isPublishableItem(item: NewsItem): boolean {
    if (this.containsGenerationFailure(item.titleHe || '') ||
        this.containsGenerationFailure(item.summaryHe || '') ||
        this.containsGenerationFailure(item.articleHe || '')) {
      return false;
    }

    const feedCode = item.feed?.code;
    if ((feedCode === 'romania' || feedCode === 'technology') &&
        (!item.articleHe || item.articleHe.trim().length < 200)) {
      return false;
    }

    return true;
  }

  private containsGenerationFailure(value: string): boolean {
    if (!value) return false;

    const normalized = value
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    const failureMarkers = [
      'לא סופק טקסט של כתבת מקור',
      'לא התקבל טקסט של כתבת מקור',
      'לא התקבל טקסט מקור',
      'לא ניתן לעבד את הכתבה',
      'לא ניתן לעבד את הטקסט',
      'לא ניתן להפיק כתבה',
      'לא ניתן לייצר כתבה',
      'אין מספיק מידע כדי',
      'ללא טקסט מקור',
      'source article text was not provided',
      'source text was not provided',
      'no source article text',
      'insufficient source text',
    ];

    return failureMarkers.some(marker => normalized.includes(marker));
  }
}
