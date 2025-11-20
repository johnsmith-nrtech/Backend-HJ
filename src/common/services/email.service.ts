import { Injectable, Logger } from '@nestjs/common';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: MailerSend;
  private from: Sender;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('MAILERSEND_API_KEY');
    this.client = new MailerSend({ apiKey: apiKey || '' });
    this.from = new Sender(
      this.config.get<string>('MAIL_FROM_ADDRESS') || 'no-reply@yourdomain.com',
      this.config.get<string>('MAIL_FROM_NAME') || 'Sopa Deal',
    );
  }

  private loadTemplate(templateFileName: string): string {
    // Resolve relative to compiled file location first, then fall back to CWD
    const compiledDir = path.resolve(__dirname, '../../../templates/emails');
    const compiledPath = path.join(compiledDir, templateFileName);
    if (fs.existsSync(compiledPath)) {
      return fs.readFileSync(compiledPath, 'utf8');
    }

    const cwdDir = path.resolve(process.cwd(), 'templates', 'emails');
    const cwdPath = path.join(cwdDir, templateFileName);
    if (fs.existsSync(cwdPath)) {
      return fs.readFileSync(cwdPath, 'utf8');
    }

    throw new Error(
      `Template not found: ${templateFileName} (looked in ${compiledDir} and ${cwdDir})`,
    );
  }

  async sendWelcomeEmail(params: {
    toEmail: string;
    toName: string;
    firstName: string;
  }): Promise<void> {
    const sandbox =
      (this.config.get<string>('MAILERSEND_SANDBOX') || 'false') === 'true';

    const raw = this.loadTemplate('welcome.html');
    const html = raw
      .replace(/\[First Name\]/g, params.firstName)
      .replace(
        /\[Website URL\]/g,
        this.config.get<string>('PUBLIC_WEBSITE_URL') || '#',
      )
      .replace(
        /\[Support Email\]/g,
        this.config.get<string>('PUBLIC_SUPPORT_EMAIL') ||
          'support@example.com',
      )
      .replace(
        /\[Phone Number\]/g,
        this.config.get<string>('PUBLIC_SUPPORT_PHONE') || '',
      );

    const recipients = [new Recipient(params.toEmail, params.toName)];
    const emailParams = new EmailParams()
      .setFrom(this.from)
      .setTo(recipients)
      .setSubject('Welcome to Sofa Deal – Let’s Get Comfy! 🛋️')
      .setHtml(html)
      .setText(
        `Welcome to Sofa Deal, ${params.firstName}! Use code WELCOME10 for 10% off.`,
      );

    if (sandbox) {
      this.logger.debug(
        `[SANDBOX] Would send welcome email → ${params.toEmail}`,
      );
      return;
    }

    await this.client.email.send(emailParams);
    this.logger.log(`Sent welcome email → ${params.toEmail}`);
  }
}
