import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { NewsItem } from './entities/news-item.entity';

@Injectable()
export class NewsImageService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NewsImageService.name);

  private readonly allowedDomains = [
    'ynet.co.il',
    'walla.co.il',
    'maariv.co.il',
    'themarker.com',
    'one.co.il',
    'digi24.ro',
    'hotnews.ro',
    'g4media.ro',
    'biziday.ro',
    'recorder.ro',
    'argesplus.ro',
    'gsp.ro',
    'techcrunch.com',
    'arstechnica.com',
    'infoq.com',
    'bleepingcomputer.com',
    'theregister.com',
    'venturebeat.com',
  ];

  constructor(
    @InjectRepository(NewsItem)
    private readonly newsItemRepo: Repository<NewsItem>,
  ) {}

  onApplicationBootstrap() {
    // Do not delay Nest startup. Existing stories are enriched in the background.
    setTimeout(() => {
      void this.backfillRecentImages();
    }, 4000);
  }

  @Cron('20 * * * *', { timeZone: 'Asia/Jerusalem' })
  async handleImageBackfill() {
    await this.backfillRecentImages();
  }

  async resolveImageUrl(sourceUrl: string): Promise<string | null> {
    if (!this.isAllowedSource(sourceUrl)) {
      return null;
    }

    try {
      const response = await axios.get<string>(sourceUrl, {
        responseType: 'text',
        timeout: 5000,
        maxContentLength: 2_500_000,
        maxBodyLength: 2_500_000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LiDaNews/1.0; +https://www.lidasoftware.online)',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'he,en;q=0.8,ro;q=0.7',
        },
      });

      const html = String(response.data || '').slice(0, 350_000);
      const candidate = this.extractImageCandidate(html);
      if (!candidate) return null;

      const normalized = new URL(this.decodeHtmlEntities(candidate), sourceUrl);
      if (normalized.protocol !== 'https:' && normalized.protocol !== 'http:') {
        return null;
      }

      return normalized.toString();
    } catch (error: any) {
      this.logger.debug(`Image metadata lookup failed for ${sourceUrl}: ${error?.message || error}`);
      return null;
    }
  }

  private async backfillRecentImages(limit = 18): Promise<void> {
    const retryBefore = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const items = await this.newsItemRepo
      .createQueryBuilder('newsItem')
      .select(['newsItem.id', 'newsItem.sourceUrl'])
      .where('newsItem.isActive = :isActive', { isActive: true })
      .andWhere('(newsItem.imageUrl IS NULL OR newsItem.imageUrl = :empty)', { empty: '' })
      .andWhere('(newsItem.imageLookupAttemptedAt IS NULL OR newsItem.imageLookupAttemptedAt < :retryBefore)', { retryBefore })
      .orderBy('newsItem.publishedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('newsItem.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    if (items.length === 0) return;

    const results = await Promise.allSettled(
      items.map(async (item) => {
        const imageUrl = await this.resolveImageUrl(item.sourceUrl);
        await this.newsItemRepo.update(item.id, {
          imageUrl,
          imageLookupAttemptedAt: new Date(),
        });
        return Boolean(imageUrl);
      }),
    );

    const enriched = results.filter(
      result => result.status === 'fulfilled' && result.value,
    ).length;

    this.logger.log(`News image backfill: ${enriched}/${items.length} stories enriched`);
  }

  private isAllowedSource(sourceUrl: string): boolean {
    try {
      const url = new URL(sourceUrl);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      return this.allowedDomains.some(domain => host === domain || host.endsWith(`.${domain}`));
    } catch {
      return false;
    }
  }

  private extractImageCandidate(html: string): string | null {
    const metaPatterns = [
      /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]*>/i,
      /<meta[^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]*>/i,
      /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["'][^>]*>/i,
    ];

    for (const pattern of metaPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1].trim();
    }

    return null;
  }

  private decodeHtmlEntities(value: string): string {
    return value
      .replace(/&amp;/gi, '&')
      .replace(/&#x2F;/gi, '/')
      .replace(/&#47;/g, '/')
      .replace(/&quot;/gi, '"');
  }
}
