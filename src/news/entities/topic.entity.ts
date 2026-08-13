import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany } from 'typeorm';
import { NewsItem } from './news-item.entity';

@Entity({ schema: 'news', name: 'topics' })
export class Topic {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'code', type: 'varchar', length: 100, unique: true })
  code!: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @ManyToMany(() => NewsItem, (newsItem) => newsItem.topics)
  newsItems?: NewsItem[];
}
