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

    async sendActivationCode(to: string, code: string) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const mailOptions = {
            from: '"Benzo Tracker" <zzzi10@gmail.com>',
            to,
            subject: '🔒 Your Activation Code',
            text: `Welcome to Benzo Tracker!\n\nYour activation code is: ${code}\n\nPlease enter it in the app on this link:\n\n\ ${baseUrl}/activate.html`
        };

        await this.transporter.sendMail(mailOptions);
    }
}
