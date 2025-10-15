"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("./user.entity");
const uuid_1 = require("uuid");
const mail_service_1 = require("./mail.service");
let AuthService = class AuthService {
    constructor(usersRepo, jwtService, mailService) {
        this.usersRepo = usersRepo;
        this.jwtService = jwtService;
        this.mailService = mailService;
    }
    async validateUser(email, pass) {
        const user = await this.usersRepo.findOne({ where: { email } });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account not activated. Check your email.');
        }
        const isMatch = await bcrypt.compare(pass, user.password);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return user;
    }
    async login(user) {
        const payload = { sub: user.id, email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
    async registerUser(dto) {
        const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
        if (existing) {
            throw new common_1.BadRequestException('This email is already Exists.');
        }
        if (!dto.password) {
            throw new common_1.BadRequestException('Password is required');
        }
        const hashed = await bcrypt.hash(dto.password, 10);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const user = this.usersRepo.create(Object.assign(Object.assign({}, dto), { password: hashed, isActive: false, benzosType: dto.benzosType, userName: dto.userName, activationCode: code }));
        console.log('Generated token:', user.activationToken);
        const response = await this.usersRepo.save(user);
        await this.mailService.sendActivationCode(user.email, code);
        return response;
    }
    async activateUser(token) {
        const user = await this.usersRepo.findOne({ where: { activationToken: token } });
        console.log("-----------------------");
        console.log('🔍 Found user:', user);
        console.log("-----------------------");
        if (!user)
            return null;
        user.isActive = true;
        user.activationToken = null;
        return this.usersRepo.save(user);
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch)
            throw new common_1.UnauthorizedException('Current password is incorrect');
        user.password = await bcrypt.hash(newPassword, 10);
        await this.usersRepo.save(user);
    }
    async verifyActivationCode(email, code) {
        const user = await this.usersRepo.findOne({ where: { email } });
        if (!user || user.activationCode !== code) {
            throw new common_1.BadRequestException('Invalid activation code');
        }
        user.isActive = true;
        user.activationCode = null;
        await this.usersRepo.save(user);
        return { message: '✅ Account activated. You can now log in.' };
    }
    async confirmWithCode(email, code) {
        const user = await this.usersRepo.findOne({ where: { email: email, activationCode: code } });
        if (!user)
            throw new common_1.BadRequestException('Invalid code');
        user.isActive = true;
        user.activationCode = null;
        return this.usersRepo.save(user);
    }
    async requestResetPassword(email) {
        const user = await this.usersRepo.findOne({ where: { email } });
        if (user) {
            const token = (0, uuid_1.v4)();
            const expiry = new Date();
            expiry.setHours(expiry.getHours() + 1);
            user.resetPasswordToken = token;
            user.resetTokenExpiry = expiry;
            await this.usersRepo.save(user);
            await this.mailService.sendPasswordResetEmail(user.email, token);
            return { message: 'Password reset link has been sent to your email.' };
        }
    }
    async resetPassword(dto) {
        const user = await this.usersRepo.findOne({ where: { resetPasswordToken: dto.token } });
        if (!user) {
            throw new common_1.NotFoundException('Invalid or expired token.');
        }
        const now = new Date();
        if (!user.resetTokenExpiry || user.resetTokenExpiry < now) {
            throw new common_1.BadRequestException('Token has expired.');
        }
        if (!dto.newPassword) {
            throw new common_1.BadRequestException('New password is required');
        }
        user.password = await bcrypt.hash(dto.newPassword, 10);
        user.resetPasswordToken = null;
        user.resetTokenExpiry = null;
        await this.usersRepo.save(user);
        return { message: '✅ Password successfully reset.' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeof (_a = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _a : Object, mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map