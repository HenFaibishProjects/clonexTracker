import { Controller, Get, Post, Body, Delete } from '@nestjs/common';
import { NotesService } from './notes.service';

@Controller('notes')
export class NotesController {
    constructor(private readonly notesService: NotesService) {}

    @Get()
    getAll() {
        return this.notesService.findAll();
    }

    @Post('save')
    saveNote(@Body() body: { note_key: string; content: string }) {
        return this.notesService.save(body.note_key, body.content);
    }

    @Delete('reset')
    resetNotes() {
        return this.notesService.resetAll();
    }
}
