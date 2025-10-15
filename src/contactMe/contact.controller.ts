import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {ContactService} from "./contact.service";

@Controller('contact')
export class ContactController {
    constructor(private readonly contactService: ContactService) {
    }

    @Post('send')
    @HttpCode(HttpStatus.OK)
    async sendContactEmail(@Body() body: { name: string; email: string; subject: string; message: string }) {
        try {
            await this.contactService.sendContactEmail(body.name, body.email, body.subject, body.message);
            return { success: true, message: 'Email sent successfully' };
        } catch (error) {
            console.error('Failed to send contact email:', error);
            throw error;
        }
    }
}
