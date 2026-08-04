import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { InterviewPrepSectionStatus } from '../interview-prep-status.enum';

export class CreateSectionStateDto {
    @IsNotEmpty({ message: 'topicId must not be empty.' })
    @IsString({ message: 'topicId must be a string.' })
    @MaxLength(100, { message: 'topicId maximum length is 100 characters.' })
    topicId!: string;

    @IsNotEmpty({ message: 'sectionId must not be empty.' })
    @IsString({ message: 'sectionId must be a string.' })
    @MaxLength(150, { message: 'sectionId maximum length is 150 characters.' })
    sectionId!: string;

    @IsOptional()
    @IsEnum(InterviewPrepSectionStatus, {
        message: 'status must be one of: not-started, in-progress, completed, review.',
    })
    status?: InterviewPrepSectionStatus;

    @IsOptional()
    @IsString({ message: 'note must be a string.' })
    note?: string;
}
