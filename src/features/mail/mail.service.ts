import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  private loadTemplate(templateName: string): string {
    const templatePath = path.join(
      process.cwd(),
      'templates',
      `${templateName}.html`,
    );
    return fs.readFileSync(templatePath, 'utf-8');
  }

  private renderTemplate(
    template: string,
    variables: Record<string, string>,
  ): string {
    return Object.entries(variables).reduce(
      (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
      template,
    );
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

  // 🔒 EXISTING METHOD — NO CHANGE
  async sendAbandonedCartEmail(
    to: string,
    customerName: string,
    cartUrl: string,
  ) {
    const subject = 'We saved the items in your cart! 🛒';

    const html = `
      <p>Hi ${customerName},</p>

      <p>We noticed you left a few things behind! We've kept your selection safe in your cart so you can pick up exactly where you left off.</p>

      <p>Whether you were interrupted or just needed a moment to think it over, we're here to help if you have any questions.</p>

      <p style="margin:20px 0;">
        <a href="${cartUrl}"
           style="background:#000;color:#fff;padding:12px 18px;
           text-decoration:none;border-radius:6px;">
          View Your Cart & Checkout
        </a>
      </p>

      <p>Thanks for shopping with us!</p>
      <p><strong>The Brand Name Team</strong></p>
    `;

    return this.sendEmail(to, subject, html);
  }

  // Assigned Coupon Email
  async sendCouponEmail(params: {
    recipientEmail: string;
    recipientName: string;
    couponName: string;
    couponCode: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    expiresAt: string;
  }): Promise<void> {
    const {
      recipientEmail,
      recipientName,
      couponName,
      couponCode,
      discountType,
      discountValue,
      expiresAt,
    } = params;

    const discountDisplay =
      discountType === 'percentage'
        ? `${discountValue}%`
        : `£${discountValue.toFixed(2)}`;

    const formattedExpiry = new Date(expiresAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const template = this.loadTemplate('emails/coupon');
    const html = this.renderTemplate(template, {
      recipientName,
      recipientEmail,
      couponName,
      couponCode,
      discountDisplay,
      expiresAt: formattedExpiry,
      shopUrl: process.env.FRONTEND_BASE_URL || 'https://sofadeal.com',
    });

    const subject = `🎁 Your exclusive coupon: ${couponCode} — ${discountDisplay} off!`;

    await this.sendEmail(recipientEmail, subject, html);
    this.logger.log(`Coupon email sent to ${recipientEmail} for code ${couponCode}`);
  }
}