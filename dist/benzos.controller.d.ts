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
}
export {};
