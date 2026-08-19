import {
  IsString,
  IsOptional,
  IsUrl,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsArray,
  IsNotEmpty,
} from 'class-validator';

export class UpdateNewsItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  feedCode?: string;

  @IsOptional()
  @IsString()
  titleHe?: string;

  @IsOptional()
  @IsString()
  originalTitle?: string;

  @IsOptional()
  @IsString()
  summaryHe?: string;

  @IsOptional()
  @IsString()
  articleHe?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  sourceName?: string;

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  companyTopic?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  importanceScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  personalScore?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  includedInBriefing?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  displayWeekStart?: string;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsDateString()
  collectedAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  topicCodes?: string[];
}
