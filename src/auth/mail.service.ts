import {Injectable} from '@nestjs/common';
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

    async sendPasswordResetEmail(to: string | undefined, token: string) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/reset-password.html?token=${token}`;


        const mailOptions = {
            from: '"Benzos Tracker" <zzzi10@gmail.com>',
            to,
            subject: '🔒 Password Reset Request',
            html: `
            <p>You requested a password reset.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>This link will expire in 1 hour.</p>
        `
        };

        await this.transporter.sendMail(mailOptions);
    }
}
