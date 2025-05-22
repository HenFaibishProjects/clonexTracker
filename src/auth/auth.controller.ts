import {Controller, Post, Body, UnauthorizedException, Get, Query, NotFoundException} from '@nestjs/common';
import { AuthService } from './auth.service';
import {RegisterDto} from "./register.dot";

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    async login(@Body() body: { email: string; password: string }) {
        const user = await this.authService.validateUser(body.email, body.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @Post('signup')
    async signup(@Body() body: { email: string; password: string }) {
        return this.authService.signup(body.email, body.password);
    }

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        await this.authService.registerUser(dto);
        return { message: '✅ Registration successful! Please check your email to activate your account.' };
    }

    @Get('confirm')
    async confirm(@Query('token') token: string) {
        const user = await this.authService.activateUser(token);
        if (!user) throw new NotFoundException('Invalid or expired activation token');
        return { message: '✅ Account activated. You can now log in.' };
    }

    @Get('activate')
    async activate(@Query('token') token: string) {
        const user = await this.authService.activateUser(token);
        if (!user) {
            throw new NotFoundException('Invalid or expired activation token');
        }
        return { message: '✅ Account activated successfully. You can now log in.' };
    }

}
