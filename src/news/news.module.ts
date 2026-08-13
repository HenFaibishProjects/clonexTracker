import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { Feed } from './entities/feed.entity';
import { NewsItem } from './entities/news-item.entity';
import { Topic } from './entities/topic.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feed, NewsItem, Topic]),
  ],
  controllers: [NewsController],
  providers: [NewsService],
})
export class NewsModule {}
