import { Repository } from 'typeorm';
import { BenzosEntry } from './benzos.entity';
import { User } from "./auth/user.entity";
export declare class BenzosService {
    private benzosEntryRepository;
    private userRepo;
    constructor(benzosEntryRepository: Repository<BenzosEntry>, userRepo: Repository<User>);
    changeName(newName: string, userId: number): Promise<User>;
    addEntry(data: Partial<BenzosEntry>, userId: number): Promise<BenzosEntry>;
    getAllEntries(userId: number): Promise<BenzosEntry[]>;
    getBetweenDates(from: string, to: string, userId: number): Promise<BenzosEntry[]>;
    deleteOne(id: number, userId: number): Promise<void>;
    deleteMany(ids: number[], userId: number): Promise<void>;
    updateOne(id: number, data: Partial<BenzosEntry>, userId: number): Promise<void>;
    changeBenzosType(newBenzosType: string, userId: number): Promise<User>;
    setTaperingGoal(goalData: {
        startDosage: number;
        targetDosage: number;
        startDate: Date;
        targetDate: Date;
        notes?: string;
    }, userId: number): Promise<User>;
    getTaperingGoal(userId: number): Promise<{
        startDosage: number | null | undefined;
        targetDosage: number | null | undefined;
        startDate: Date | null | undefined;
        targetDate: Date | null | undefined;
        notes: string | null | undefined;
        isActive: boolean;
    }>;
    updateTaperingGoal(goalData: Partial<{
        startDosage: number;
        targetDosage: number;
        startDate: Date;
        targetDate: Date;
        notes: string;
    }>, userId: number): Promise<User>;
    deactivateTaperingGoal(userId: number): Promise<User>;
    getTaperingProgress(userId: number): Promise<{
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
