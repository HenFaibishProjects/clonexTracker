import { IsEmail, IsNotEmpty } from 'class-validator';
import {Column} from "typeorm";

export class RegisterDto {
    @IsEmail()
    email: string | undefined;

    @IsNotEmpty()
    password: string | undefined;

    @IsNotEmpty()
    userName: string | undefined;

    @IsNotEmpty()
    benzosType: string | undefined;
}
