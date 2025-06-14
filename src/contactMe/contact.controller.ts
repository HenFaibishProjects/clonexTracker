import { Controller, Post, Body } from '@nestjs/common';
import {ContactService} from "./contact.service";

@Controller('contact')
export class ContactController {
    constructor(private readonly contactService: ContactService) {
    }

    @Post('send')
    async sendContactEmail(@Body() body: { name: string; email: string; subject: string; message: string }) {
        await this.contactService.sendContactEmail(body.name, body.email, body.subject, body.message)
    }
}
