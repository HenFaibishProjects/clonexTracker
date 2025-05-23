import { IsEmail, IsNotEmpty } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string | undefined;

    @IsNotEmpty()
    password: string | undefined;

    @IsNotEmpty()
    name: string | undefined;
}
