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
}
