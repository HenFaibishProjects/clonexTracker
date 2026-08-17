import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import { NewsItem } from './entities/news-item.entity';
import { Feed } from './entities/feed.entity';
import { Topic } from './entities/topic.entity';
import { CreateNewsItemDto } from './dto/create-news-item.dto';
import { UpdateNewsItemDto } from './dto/update-news-item.dto';

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
      // Another instance may have created the same feed concurrently during startup.
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

      return qb
        .orderBy('newsItem.isFeatured', 'DESC')
        .addOrderBy('newsItem.importanceScore', 'DESC')
        .addOrderBy('newsItem.publishedAt', 'DESC')
        .getMany();
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

    return this.newsItemRepo.find({
      where,
      order: {
        isFeatured: 'DESC',
        importanceScore: 'DESC',
        publishedAt: 'DESC',
      },
      relations: ['feed', 'topics'],
    });
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
    return qb.getMany();
  }

  async create(data: CreateNewsItemDto): Promise<NewsItem> {
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

    const newItem = this.newsItemRepo.create({
      ...restData,
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

    return this.newsItemRepo.find({
      where,
      order: {
        isFeatured: 'DESC',
        importanceScore: 'DESC',
        publishedAt: 'DESC',
      },
      relations: ['feed', 'topics'],
    });
  }

  async findOne(id: string): Promise<NewsItem> {
    const item = await this.newsItemRepo.findOne({
      where: { id },
      relations: ['feed', 'topics'],
    });

    if (!item) {
      throw new NotFoundException(`NewsItem with ID ${id} not found`);
    }

    return item;
  }

  async update(id: string, data: UpdateNewsItemDto): Promise<NewsItem> {
    const item = await this.findOne(id);
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
    const item = await this.findOne(id);
    item.isActive = false;
    return this.newsItemRepo.save(item);
  }
}
