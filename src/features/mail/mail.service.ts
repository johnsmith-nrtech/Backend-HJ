import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      const msg = {
        to,
        from: process.env.EMAIL_FROM!,
        subject,
        html,
      };

      const response = await sgMail.send(msg);
      this.logger.log(`Email sent to ${to}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error as any);
      throw error;
    }
  }
}
