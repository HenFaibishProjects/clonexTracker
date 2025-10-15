import { BenzosService } from './benzos.service';
import { BenzosEntry } from './benzos.entity';
import { User } from "./auth/user.entity";
interface AuthenticatedRequest extends Request {
    user: User;
}
export declare class BenzosController {
    private readonly benzosService;
    constructor(benzosService: BenzosService);
    addEntry(req: AuthenticatedRequest, data: Partial<BenzosEntry>): Promise<BenzosEntry>;
    changeName(body: {
        newName: string;
    }, req: AuthenticatedRequest): Promise<User>;
    changeBenzosType(body: {
        newBenzosType: string;
    }, req: AuthenticatedRequest): Promise<User>;
    getAllEntries(req: AuthenticatedRequest): Promise<BenzosEntry[]>;
    getBetween(req: AuthenticatedRequest, from: string, to: string): Promise<BenzosEntry[]>;
    deleteOne(req: AuthenticatedRequest, id: number): Promise<void>;
    deleteMany(req: AuthenticatedRequest, body: {
        ids: number[];
    }): Promise<void>;
    updateOne(req: AuthenticatedRequest, id: number, data: Partial<BenzosEntry>): Promise<void>;
    setTaperingGoal(req: AuthenticatedRequest, goalData: {
        startDosage: number;
        targetDosage: number;
        startDate: Date;
        targetDate: Date;
        notes?: string;
    }): Promise<User>;
    getTaperingGoal(req: AuthenticatedRequest): Promise<{
        startDosage: number | null | undefined;
        targetDosage: number | null | undefined;
        startDate: Date | null | undefined;
        targetDate: Date | null | undefined;
        notes: string | null | undefined;
        isActive: boolean;
    }>;
    updateTaperingGoal(req: AuthenticatedRequest, goalData: Partial<{
        startDosage: number;
        targetDosage: number;
        startDate: Date;
        targetDate: Date;
        notes: string;
    }>): Promise<User>;
    deactivateTaperingGoal(req: AuthenticatedRequest): Promise<User>;
    getTaperingProgress(req: AuthenticatedRequest): Promise<{
        hasGoal: boolean;
        startDosage?: undefined;
        targetDosage?: undefined;
        currentAvgDosage?: undefined;
        progressPercentage?: undefined;
        timeProgress?: undefined;
        daysElapsed?: undefined;
        daysTotal?: undefined;
        daysRemaining?: undefined;
        startDate?: undefined;
        targetDate?: undefined;
        notes?: undefined;
        onTrack?: undefined;
    } | {
        hasGoal: boolean;
        startDosage: number;
        targetDosage: number;
        currentAvgDosage: number;
        progressPercentage: number;
        timeProgress: number;
        daysElapsed: number;
        daysTotal: number;
        daysRemaining: number;
        startDate: Date | null | undefined;
        targetDate: Date | null | undefined;
        notes: string | null | undefined;
        onTrack: boolean;
    }>;
}
export {};
