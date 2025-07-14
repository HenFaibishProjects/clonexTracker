import { BenzosEntry } from "../benzos.entity";
export declare class User {
    id: number | undefined;
    userName: string | undefined;
    email: string | undefined;
    password: string | undefined;
    benzosType: string | undefined;
    activationCode?: string | null;
    createdAt: Date | undefined;
    entries: BenzosEntry[] | undefined;
    isActive: boolean;
    activationToken: string | undefined | null;
    resetPasswordToken: string | undefined | null;
    resetTokenExpiry: Date | undefined | null;
}
