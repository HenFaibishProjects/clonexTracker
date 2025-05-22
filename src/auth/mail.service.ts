import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.example.com',
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
            user: process.env.SMTP_USER || 'your@email.com',
            pass: process.env.SMTP_PASS || 'your_password',
        },
    });

    async sendConfirmationEmail(to: string, token: string) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const url = `${baseUrl}/activate?token=${token}`;

        console.log('Sending mail to', to, 'with token', token);
        try {
        await this.transporter.sendMail({
            from: '"Clonex Tracker" <zzzi10@gmail.com>',
            to,
            subject: 'Confirm your email',
            html: `<p>Welcome! Please confirm your email by clicking this link:</p>
               <a href="${url}">${url}</a>`,
        });
    }
        catch (err) {
                console.error('❌ Failed to send email:', err);
            }
    }
}
