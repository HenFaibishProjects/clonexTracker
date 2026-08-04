import {
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
} from 'class-validator';
import { InterviewPrepSectionStatus } from '../interview-prep-status.enum';

export class UpdateSectionStateDto {
    @IsOptional()
    @IsEnum(InterviewPrepSectionStatus, {
        message: 'status must be one of: not-started, in-progress, completed, review.',
    })
    status?: InterviewPrepSectionStatus;

    @IsOptional()
    @IsString({ message: 'note must be a string.' })
    note?: string;

    @IsOptional()
    @IsBoolean({ message: 'visited must be a boolean.' })
    visited?: boolean;
}
