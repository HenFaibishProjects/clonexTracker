import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string | undefined;

    @MinLength(6)
    password: string | undefined;

    @IsNotEmpty()
    name: string | undefined;
}
