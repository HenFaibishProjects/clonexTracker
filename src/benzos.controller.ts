import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query, Req,
} from '@nestjs/common';
import { BenzosService } from './benzos.service';
import { BenzosEntry } from './benzos.entity';
import { UseGuards } from '@nestjs/common';
import {User} from "./auth/user.entity";
import {JwtAuthGuard} from "./auth/jwt-auth.guard";

interface AuthenticatedRequest extends Request {
    user: User;
}

@Controller('benzos')
@UseGuards(JwtAuthGuard)
export class BenzosController {
    constructor(private readonly benzosService: BenzosService) {}

    @Post()
    async addEntry(@Req() req: AuthenticatedRequest, @Body() data: Partial<BenzosEntry>): Promise<BenzosEntry> {
        return this.benzosService.addEntry(data, req.user.id!);
    }

    @Post('/changeName')
    async changeName(@Body() body: { newName: string }, @Req() req: AuthenticatedRequest): Promise<User> {
        return this.benzosService.changeName(body.newName, req.user.id!);
    }

    @Post('/changeBenzosType')
    async changeBenzosType(@Body() body: { newBenzosType: string }, @Req() req: AuthenticatedRequest): Promise<User> {
        return this.benzosService.changeBenzosType(body.newBenzosType, req.user.id!);
    }

    @Get()
    async getAllEntries(@Req() req: AuthenticatedRequest): Promise<BenzosEntry[]> {
        return this.benzosService.getAllEntries(req.user.id!);
    }

    @Get('/between')
    async getBetween(
        @Req() req: AuthenticatedRequest,
        @Query('from') from: string,
        @Query('to') to: string,
    ): Promise<BenzosEntry[]> {
        return this.benzosService.getBetweenDates(from, to, req.user.id!);
    }

    @Delete(':id')
    async deleteOne(@Req() req: AuthenticatedRequest, @Param('id') id: number): Promise<void> {
        return this.benzosService.deleteOne(id, req.user.id!);
    }

    @Post('/delete-many')
    async deleteMany(@Req() req: AuthenticatedRequest, @Body() body: { ids: number[] }): Promise<void> {
        return this.benzosService.deleteMany(body.ids, req.user.id!);
    }

    @Patch(':id')
    async updateOne(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: number,
        @Body() data: Partial<BenzosEntry>,
    ): Promise<void> {
        return this.benzosService.updateOne(id, data, req.user.id!);
    }

    // Tapering Goal Endpoints
    @Post('/tapering-goal')
    async setTaperingGoal(
        @Req() req: AuthenticatedRequest,
        @Body() goalData: {
            startDosage: number;
            targetDosage: number;
            startDate: Date;
            targetDate: Date;
            notes?: string;
        }
    ): Promise<User> {
        return this.benzosService.setTaperingGoal(goalData, req.user.id!);
    }

    @Get('/tapering-goal')
    async getTaperingGoal(@Req() req: AuthenticatedRequest) {
        return this.benzosService.getTaperingGoal(req.user.id!);
    }

    @Patch('/tapering-goal')
    async updateTaperingGoal(
        @Req() req: AuthenticatedRequest,
        @Body() goalData: Partial<{
            startDosage: number;
            targetDosage: number;
            startDate: Date;
            targetDate: Date;
            notes: string;
        }>
    ): Promise<User> {
        return this.benzosService.updateTaperingGoal(goalData, req.user.id!);
    }

    @Delete('/tapering-goal')
    async deactivateTaperingGoal(@Req() req: AuthenticatedRequest): Promise<User> {
        return this.benzosService.deactivateTaperingGoal(req.user.id!);
    }

    @Get('/tapering-progress')
    async getTaperingProgress(@Req() req: AuthenticatedRequest) {
        return this.benzosService.getTaperingProgress(req.user.id!);
    }

    @Get('/enhanced-analytics')
    async getEnhancedAnalytics(@Req() req: AuthenticatedRequest) {
        return this.benzosService.getEnhancedAnalytics(req.user.id!);
    }

}
