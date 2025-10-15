import { MailService } from "../auth/mail.service";
export declare class ContactService {
    private mailService;
    constructor(mailService: MailService);
    sendContactEmail(name: string, email: string, subject: string, message: string): Promise<void>;
}
