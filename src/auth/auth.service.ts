import {BadRequestException, Injectable, NotFoundException, UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import * as bcrypt from 'bcrypt';
import {User} from './user.entity';
import {v4 as uuidv4} from 'uuid';
import {RegisterDto} from "./register.dot";
import {MailService} from "./mail.service";
import {ResetPasswordDto} from "./ResetPassword.dto";

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private usersRepo: Repository<User>,
        private jwtService: JwtService,
        private mailService: MailService,
    ) {}

    async validateUser(email: string, pass: string): Promise<User> {
        const user = await this.usersRepo.findOne({ where: { email } });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Account not activated. Check your email.');
        }

        const isMatch = await bcrypt.compare(pass, user.password!);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return user;
    }

    async login(user: User): Promise<{ access_token: string }> {
        const payload = { sub: user.id, email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    async registerUser(dto: RegisterDto): Promise<User> {
        const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
        if (existing) {
            throw new BadRequestException('This email is already Exists.');
        }

        if (!dto.password) {
            throw new BadRequestException('Password is required');
        }

        const hashed = await bcrypt.hash(dto.password, 10);

        const code = Math.floor(100000 + Math.random() * 900000).toString();


        const user = this.usersRepo.create({
            ...dto,
            password: hashed,
            isActive: false,
            benzosType: dto.benzosType,
            userName: dto.userName,
            activationCode: code,
        });

        console.log('Generated token:', user.activationToken);

        const response = await this.usersRepo.save(user);

        await this.mailService.sendActivationCode(user.email!, code);

        return response;
    }

    async activateUser(token: string): Promise<User | null> {
        const user = await this.usersRepo.findOne({ where: { activationToken: token } });
        console.log("-----------------------"); //
        console.log('🔍 Found user:', user); //
        console.log("-----------------------"); //
        if (!user) return null;

        user.isActive = true;
        user.activationToken = null;
        return this.usersRepo.save(user);
    }

    async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const isMatch = await bcrypt.compare(currentPassword, user.password!);
        if (!isMatch) throw new UnauthorizedException('Current password is incorrect');

        user.password = await bcrypt.hash(newPassword, 10);
        await this.usersRepo.save(user);
    }

    async verifyActivationCode(email: string, code: string) {
        const user = await this.usersRepo.findOne({ where: { email } });
        if (!user || user.activationCode !== code) {
            throw new BadRequestException('Invalid activation code');
        }

        user.isActive = true;
        user.activationCode = null;
        await this.usersRepo.save(user);

        return { message: '✅ Account activated. You can now log in.' };
    }

    async confirmWithCode(email: string, code: string) {
        const user = await this.usersRepo.findOne({ where: { email: email, activationCode: code } });
        if (!user) throw new BadRequestException('Invalid code');
        user.isActive = true;
        user.activationCode = null;
        return this.usersRepo.save(user);
    }

    async requestResetPassword(email: string) {
        const user = await this.usersRepo.findOne({ where: { email } });
        if (user) {
            const token = uuidv4();
            const expiry = new Date();
            expiry.setHours(expiry.getHours() + 1);

            user.resetPasswordToken = token;
            user.resetTokenExpiry = expiry;
            await this.usersRepo.save(user);

            await this.mailService.sendPasswordResetEmail(user.email, token);

            return { message: 'Password reset link has been sent to your email.' };
        }


    }


    async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
        const user = await this.usersRepo.findOne({ where: { resetPasswordToken: dto.token } });

        if (!user) {
            throw new NotFoundException('Invalid or expired token.');
        }

        const now = new Date();
        if (!user.resetTokenExpiry || user.resetTokenExpiry < now) {
            throw new BadRequestException('Token has expired.');
        }
        if (!dto.newPassword) {
            throw new BadRequestException('New password is required');
        }

        user.password = await bcrypt.hash(dto.newPassword, 10);
        user.resetPasswordToken = null;
        user.resetTokenExpiry = null;

        await this.usersRepo.save(user);
        return { message: '✅ Password successfully reset.' };
    }

}
