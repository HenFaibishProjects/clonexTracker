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
import { ClonexService } from './clonex.service';
import { ClonexEntry } from './clonex.entity';
import { UseGuards } from '@nestjs/common';
import {User} from "./auth/user.entity";
import {JwtAuthGuard} from "./auth/jwt-auth.guard";

interface AuthenticatedRequest extends Request {
    user: User;
}

@Controller('clonex')
@UseGuards(JwtAuthGuard)
export class ClonexController {
    constructor(private readonly clonexService: ClonexService) {}

    @Post()
    async addEntry(@Req() req: AuthenticatedRequest, @Body() data: Partial<ClonexEntry>): Promise<ClonexEntry> {
        return this.clonexService.addEntry(data, req.user.id!);
    }

    @Get()
    async getAllEntries(@Req() req: AuthenticatedRequest): Promise<ClonexEntry[]> {
        return this.clonexService.getAllEntries(req.user.id!);
    }

    @Get('/between')
    async getBetween(
        @Req() req: AuthenticatedRequest,
        @Query('from') from: string,
        @Query('to') to: string,
    ): Promise<ClonexEntry[]> {
        return this.clonexService.getBetweenDates(from, to, req.user.id!);
    }

    @Delete(':id')
    async deleteOne(@Req() req: AuthenticatedRequest, @Param('id') id: number): Promise<void> {
        return this.clonexService.deleteOne(id, req.user.id!);
    }

    @Post('/delete-many')
    async deleteMany(@Req() req: AuthenticatedRequest, @Body() body: { ids: number[] }): Promise<void> {
        return this.clonexService.deleteMany(body.ids, req.user.id!);
    }

    @Patch(':id')
    async updateOne(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: number,
        @Body() data: Partial<ClonexEntry>,
    ): Promise<void> {
        return this.clonexService.updateOne(id, data, req.user.id!);
    }
}
