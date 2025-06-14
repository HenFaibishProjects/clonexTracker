import {Injectable} from "@nestjs/common";
import {MailService} from "../auth/mail.service";

@Injectable()
export class ContactService {
    constructor(
        private mailService: MailService,
    ) {
    }

    async sendContactEmail(name: string, email: string, subject: string, message: string) {
        await this.mailService.mailContactMe(subject, email, name, message);
    }
}