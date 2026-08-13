import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsItemDto } from './dto/create-news-item.dto';
import { UpdateNewsItemDto } from './dto/update-news-item.dto';
import { NewsItem } from './entities/news-item.entity';

@Controller('news')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Post()
  async create(@Body() dto: CreateNewsItemDto): Promise<NewsItem> {
    return this.newsService.create(dto);
  }

  @Get()
  async findAll(
    @Query('feedId') feedId?: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('displayWeekStart') displayWeekStart?: string,
  ): Promise<NewsItem[]> {
    return this.newsService.findAll({
      feedId,
      category,
      location,
      displayWeekStart,
    });
  }

  @Get('current-week')
  async findCurrentWeek(
    @Query('feedCode') feedCode?: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
  ): Promise<NewsItem[]> {
    return this.newsService.findCurrentWeek({ feedCode, category, location });
  }

  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('feedCode') feedCode?: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<NewsItem[]> {
    if (!q) {
      throw new BadRequestException('Search query "q" is required');
    }
    return this.newsService.search({ q, feedCode, category, location, from, to });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<NewsItem> {
    return this.newsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateNewsItemDto,
  ): Promise<NewsItem> {
    return this.newsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<NewsItem> {
    return this.newsService.remove(id);
  }
}
