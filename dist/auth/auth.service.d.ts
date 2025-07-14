import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { RegisterDto } from "./register.dot";
import { MailService } from "./mail.service";
import { ResetPasswordDto } from "./ResetPassword.dto";
export declare class AuthService {
    private usersRepo;
    private jwtService;
    private mailService;
    constructor(usersRepo: Repository<User>, jwtService: JwtService, mailService: MailService);
    validateUser(email: string, pass: string): Promise<User>;
    login(user: User): Promise<{
        access_token: string;
    }>;
    registerUser(dto: RegisterDto): Promise<User>;
    activateUser(token: string): Promise<User | null>;
    changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void>;
    verifyActivationCode(email: string, code: string): Promise<{
        message: string;
    }>;
    confirmWithCode(email: string, code: string): Promise<User>;
    requestResetPassword(email: string): Promise<{
        message: string;
    } | undefined>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
