export declare class MailService {
    private transporter;
    sendActivationCode(to: string, code: string): Promise<void>;
    sendPasswordResetEmail(to: string | undefined, token: string): Promise<void>;
    mailContactMe(subject: string, email: string, name: string, message: string): Promise<void>;
}
