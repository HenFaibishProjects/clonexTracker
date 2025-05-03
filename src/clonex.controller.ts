import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ClonexService } from './clonex.service';
import { ClonexEntry } from './clonex.entity';

@Controller('api/clonex')
export class ClonexController {
    constructor(private readonly clonexService: ClonexService) {}

    @Post()
    async addEntry(@Body() data: Partial<ClonexEntry>): Promise<ClonexEntry> {
        return this.clonexService.addEntry(data);
    }

    @Get()
    async getAllEntries(): Promise<ClonexEntry[]> {
        return this.clonexService.getAllEntries();
    }

    @Get('/between')
    async getBetween(
        @Query('from') from: string,
        @Query('to') to: string,
    ): Promise<ClonexEntry[]> {
        return this.clonexService.getBetweenDates(from, to);
    }

    @Delete(':id')
    async deleteOne(@Param('id') id: number): Promise<void> {
        return this.clonexService.deleteOne(id);
    }

    @Post('/delete-many')
    async deleteMany(@Body() body: { ids: number[] }): Promise<void> {
        return this.clonexService.deleteMany(body.ids);
    }

    @Patch(':id')
    async updateOne(
        @Param('id') id: number,
        @Body() data: Partial<ClonexEntry>,
    ): Promise<void> {
        return this.clonexService.updateOne(id, data);
    }
}
