import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private usersRepo: Repository<User>,
        private jwtService: JwtService,
    ) {}

    async validateUser(email: string, pass: string): Promise<User> {
        const user = await this.usersRepo.findOne({ where: { email } });
        if (user && await bcrypt.compare(pass, user.password!)) {
            return user;
        }
        throw new UnauthorizedException('Invalid credentials');
    }

    async login(user: User): Promise<{ access_token: string }> {
        const payload = { sub: user.id, email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    async signup(email: string, password: string): Promise<User> {
        const existing = await this.usersRepo.findOne({ where: { email } });
        if (existing) throw new UnauthorizedException('Email already exists');

        const hashed = await bcrypt.hash(password, 10);
        const user = this.usersRepo.create({ email, password: hashed });
        return this.usersRepo.save(user);
    }
}
