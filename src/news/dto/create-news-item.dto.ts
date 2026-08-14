import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsArray,
} from 'class-validator';

export class CreateNewsItemDto {
  @IsNotEmpty()
  @IsString()
  feedCode!: string;

  @IsNotEmpty()
  @IsString()
  titleHe!: string;

  @IsOptional()
  @IsString()
  originalTitle?: string;

  @IsNotEmpty()
  @IsString()
  summaryHe!: string;

  @IsOptional()
  @IsString()
  articleHe?: string;

  @IsNotEmpty()
  @IsString()
  sourceName!: string;

  @IsNotEmpty()
  @IsUrl()
  sourceUrl!: string;

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

  @IsNotEmpty()
  @IsDateString()
  displayWeekStart!: string;

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
