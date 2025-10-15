import { AuthService } from './auth.service';
import { RegisterDto } from "./register.dot";
import { LoginResponseDto } from "./loginResponse.dto";
import { User } from "./user.entity";
import { ResetPasswordDto } from "./ResetPassword.dto";
export interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        email: string;
    };
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: {
        email: string;
        password: string;
    }): Promise<LoginResponseDto>;
    changePassword(req: AuthenticatedRequest, body: {
        currentPassword: string;
        newPassword: string;
    }): Promise<void>;
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    verifyCode(body: {
        email: string;
        code: string;
    }): Promise<{
        message: string;
    }>;
    confirmWithCode(body: {
        code: string;
        email: string;
    }): Promise<User>;
    confirm(token: string): Promise<{
        message: string;
    }>;
    activate(token: string): Promise<{
        message: string;
    }>;
    requestResetPassword(email: string): Promise<{
        message: string;
    } | undefined>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
