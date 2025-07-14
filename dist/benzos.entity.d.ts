import { User } from "./auth/user.entity";
export declare class BenzosEntry {
    id?: number;
    dosageMg: number | undefined;
    takenAt: Date | undefined;
    reason?: string;
    comments?: string;
    user: User | undefined;
}
