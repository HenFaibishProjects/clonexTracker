import { User } from './user.entity';
import { Repository } from 'typeorm';
declare const JwtStrategy_base: any;
export declare class JwtStrategy extends JwtStrategy_base {
    private usersRepo;
    constructor(usersRepo: Repository<User>);
    validate(payload: {
        sub: number;
    }): Promise<{
        id: number | undefined;
        email: string | undefined;
    } | null>;
}
export {};
