import {
    Controller,
    Post,
    Body,
    UnauthorizedException,
    Get,
    Query,
    NotFoundException,
    Req,
    Patch,
    UseGuards
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from "./register.dot";
import {LoginResponseDto} from "./loginResponse.dto";
import {User} from "./user.entity";
import {AuthGuard} from "@nestjs/passport";
import {JwtAuthGuard} from "./jwt-auth.guard";

export interface AuthenticatedRequest extends Request {
    user?: { id: number; email: string };
}

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    async login(@Body() body: { email: string; password: string }) {
        const user = await this.authService.validateUser(body.email, body.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokenObj = await this.authService.login(user);
        return {
            access_token: tokenObj.access_token,
            email: user.email,
            name: user.userName
        } as LoginResponseDto;

    }

    @UseGuards(JwtAuthGuard)
    @Patch('change-password')
    async changePassword(
        @Req() req: AuthenticatedRequest,
        @Body() body: { currentPassword: string; newPassword: string }
    ) {
        const userId = req.user?.id;
        if (!userId) throw new UnauthorizedException();

        return this.authService.changePassword(userId, body.currentPassword, body.newPassword);
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
