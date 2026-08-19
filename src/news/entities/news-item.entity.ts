import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { Feed } from './feed.entity';
import { Topic } from './topic.entity';

@Entity({ schema: 'news', name: 'news_items' })
export class NewsItem {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'feed_id', type: 'bigint' })
  feedId!: string;

  @Column({ name: 'title_he', type: 'text' })
  titleHe!: string;

  @Column({ name: 'original_title', type: 'text', nullable: true })
  originalTitle?: string;

  @Column({ name: 'summary_he', type: 'text' })
  summaryHe!: string;

  @Column({ name: 'article_he', type: 'text', nullable: true })
  articleHe?: string | null;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl?: string | null;

  @Column({ name: 'image_lookup_attempted_at', type: 'timestamptz', nullable: true, select: false })
  imageLookupAttemptedAt?: Date | null;

  @Column({ name: 'source_name', type: 'varchar', length: 150 })
  sourceName!: string;

  @Column({ name: 'source_url', type: 'text', unique: true })
  sourceUrl!: string;

  @Column({ name: 'category', type: 'varchar', length: 100, nullable: true })
  category?: string;

  @Column({ name: 'location', type: 'varchar', length: 150, nullable: true })
  location?: string;

  @Column({ name: 'company_topic', type: 'varchar', length: 150, nullable: true })
  companyTopic?: string;

  @Column({ name: 'importance_score', type: 'smallint', nullable: true })
  importanceScore?: number;

  @Column({ name: 'personal_score', type: 'smallint', nullable: true })
  personalScore?: number;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured!: boolean;

  @Column({ name: 'included_in_briefing', type: 'boolean', default: false })
  includedInBriefing!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'display_week_start', type: 'date' })
  displayWeekStart!: Date | string;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'collected_at', type: 'timestamptz', default: () => 'NOW()' })
  collectedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;

  @ManyToOne(() => Feed, (feed) => feed.newsItems)
  @JoinColumn({ name: 'feed_id' })
  feed?: Feed;

  @ManyToMany(() => Topic, (topic) => topic.newsItems)
  @JoinTable({
    name: 'news_item_topics',
    schema: 'news',
    joinColumn: { name: 'news_item_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'topic_id', referencedColumnName: 'id' }
  })
  topics?: Topic[];
}
