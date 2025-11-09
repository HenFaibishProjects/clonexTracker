import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './notes.entity';

@Injectable()
export class NotesService {
    constructor(
        @InjectRepository(Note)
        private readonly notesRepo: Repository<Note>,
    ) {}

    findAll() {
        return this.notesRepo.find();
    }

    async save(note_key: string, content: string) {
        let note = await this.notesRepo.findOne({ where: { note_key } });
        if (!note) note = this.notesRepo.create({ note_key, content });
        else note.content = content;
        return this.notesRepo.save(note);
    }

    async resetAll() {
        await this.notesRepo.clear();
        return { success: true };
    }
}
