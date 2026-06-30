import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CompareTextsDto {
    @IsNotEmpty({ message: 'textA is required and cannot be empty.' })
    @IsString({ message: 'textA must be a string.' })
    @MaxLength(1000, { message: 'textA must be under 1000 characters.' })
    textA!: string;

    @IsNotEmpty({ message: 'textB is required and cannot be empty.' })
    @IsString({ message: 'textB must be a string.' })
    @MaxLength(1000, { message: 'textB must be under 1000 characters.' })
    textB!: string;
}
