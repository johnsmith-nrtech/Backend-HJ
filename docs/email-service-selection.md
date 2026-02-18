## Email service for order status notifications

This document recommends a simple, developer‑friendly email provider to notify customers when an order is placed and whenever an admin updates the order status (e.g., pending → shipped → delivered → cancelled).

### Table of contents

- [Recommendation: MailerSend (best balance of simplicity + cost)](#recommendation-mailersend-best-balance-of-simplicity--cost)
- [Create a MailerSend account and get API key](#create-a-mailersend-account-and-get-api-key)
- [Quick backend integration (NestJS)](#quick-backend-integration-nestjs)
- [Environment variables](#environment-variables)
- [Verify sender/domain and MAIL_FROM_ADDRESS](#verify-senderrdomain-and-mail_from_address)
- [Recipient email verification (API)](#recipient-email-verification-api)
- [Alternatives at a glance](#alternatives-at-a-glance)
- [Decision summary](#decision-summary)
- [Next steps](#next-steps)

### Recommendation: MailerSend (best balance of simplicity + cost)

- **Why**: Very straightforward REST/Node SDK, good templates, generous free tier, and an easy sandbox for testing. Ideal for quickly wiring emails from the backend without extra services like Zapier.
- **Pricing**: Free 1,000 emails/month. Paid plans start at $28/month for 50,000 emails.
- **Test mode**: Sandbox mode lets you send/test without affecting reputation; you can preview templates and payloads safely.
- **Features**: API + SMTP, templates (drag‑and‑drop or HTML), analytics, and email verification API.

Useful links: [MailerSend](https://www.mailersend.com) · [Node SDK](https://github.com/mailersend/mailersend-js)

### Create a MailerSend account and get API key

1) Sign up at MailerSend and create your organization/project.
2) Verify a custom domain: add the DNS records (SPF, DKIM, optional DMARC) shown in MailerSend until they validate.
3) Create an API token: go to API Tokens → Generate token. Name it (e.g., "Backend - Production") and grant send permissions.
4) Understand credits/limits: Free plan includes 1,000 emails/month. Paid plans increase limits. Sandbox/testing won’t hurt reputation.
5) Optional: Add a test recipient or enable sandbox/testing while integrating.

### Quick backend integration (NestJS)

1) Install dependency:

```bash
npm i mailersend
```

2) Configure environment variables:

```bash
# Required
MAILERSEND_API_KEY=your_mailersend_api_key
MAIL_FROM_ADDRESS=no-reply@yourdomain.com
MAIL_FROM_NAME=Sopa Deal

# Optional (useful for testing/sandbox)
MAILERSEND_SANDBOX=true
```

3) Example service you can add (keep it in `src/common/services/email.service.ts` and export from `CommonModule`):

```ts
import { Injectable, Logger } from '@nestjs/common';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: MailerSend;
  private from: Sender;

  constructor() {
    const apiKey = process.env.MAILERSEND_API_KEY as string;
    this.client = new MailerSend({ apiKey });
    this.from = new Sender(
      process.env.MAIL_FROM_ADDRESS || 'no-reply@yourdomain.com',
      process.env.MAIL_FROM_NAME || 'Sopa Deal'
    );
  }

  async sendOrderStatusEmail(
    toEmail: string,
    toName: string,
    orderId: string,
    status: string
  ): Promise<void> {
    const recipients = [new Recipient(toEmail, toName)];
    const emailParams = new EmailParams()
      .setFrom(this.from)
      .setTo(recipients)
      .setSubject(`Your order ${orderId} is now ${status}`)
      .setHtml(
        `<p>Hi ${toName},</p>
         <p>Your order <strong>${orderId}</strong> status is now <strong>${status}</strong>.</p>
         <p>Thanks for shopping with us.</p>`
      )
      .setText(`Your order ${orderId} is now ${status}`);

    await this.client.email.send(emailParams);
    this.logger.log(`Sent ${status} email for order ${orderId} → ${toEmail}`);
  }
}
```

### Environment variables

- MAILERSEND_API_KEY: API token generated in MailerSend (keep secret).
- MAIL_FROM_ADDRESS: Verified sender email on your domain (e.g., `no-reply@yourdomain.com`).
- MAIL_FROM_NAME: Display name for emails (e.g., `Sopa Deal`).
- MAILERSEND_SANDBOX (optional): `true|false`. Keep `true` in dev/testing to avoid affecting reputation.

Example `.env`:

```bash
MAILERSEND_API_KEY=ms_api_xxxxxxxxxxxxxxxxx
MAIL_FROM_ADDRESS=no-reply@example.com
MAIL_FROM_NAME=Sopa Deal
MAILERSEND_SANDBOX=true
```

### Verify sender/domain and MAIL_FROM_ADDRESS

1) Add and verify your domain in MailerSend (DNS):
   - In MailerSend → Domains → Add domain.
   - Add the provided SPF and DKIM records at your DNS host (DMARC recommended).
   - Wait until MailerSend shows "Verified" (DNS may take minutes to hours).
2) Create a Sender Identity for the exact address you will use:
   - MailerSend → Sender identities → New sender → e.g., `no-reply@yourdomain.com`.
   - Complete any sender verification if prompted.
3) Configure your app:
   - Set `MAIL_FROM_ADDRESS` to that verified address.
   - Keep `MAILERSEND_SANDBOX=true` during development to avoid real sends.

Once verified, sending from your custom domain improves deliverability and reputation.

### Recipient email verification (API)

Optionally validate recipient emails before sending to reduce bounces and keep a clean list. Use MailerSend's Email Verification API. Results include Valid, Risky (e.g., catch_all), and Do Not Send (e.g., syntax_error, mailbox_not_found, disposable).

Reference: [MailerSend Email Verification API](https://developers.mailersend.com/api/v1/email-verification.html)

Minimal cURL (sync single email):

```bash
curl -X POST https://api.mailersend.com/v1/email-verification/verify \
  -H "Authorization: Bearer $MAILERSEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com"}'
```

Minimal TypeScript example:

```ts
import { MailerSend } from 'mailersend';

async function verifyRecipientEmail(apiKey: string, email: string) {
  const ms = new MailerSend({ apiKey });
  const res = await ms.request('post', '/v1/email-verification/verify', { email });
  return res.body?.status as string; // e.g., 'valid', 'catch_all', 'mailbox_not_found'
}

const result = await verifyRecipientEmail(process.env.MAILERSEND_API_KEY!, 'customer@example.com');
const doNotSend = ['syntax_error','typo','mailbox_not_found','disposable','mailbox_blocked'];
if (doNotSend.includes(result)) {
  // block or request a corrected address
}
```

Notes:
- The API is rate/credit limited and may return `402 Payment Required` if you lack credits.
- Use async endpoints for bulk/list verification if needed.

4) Where to call from your code now

- On admin status change: inject and call after a successful update in `src/features/orders/orders.service.ts` inside `updateOrderStatusAdmin(...)`.
- On order placement (once your create/checkout flow finalizes an order): call after you insert the order and have the customer email.

Example usage (pseudocode showing call site only):

```ts
// inside OrdersService after a successful status update
await this.emailService.sendOrderStatusEmail(
  existingOrder.contact_email,
  `${existingOrder.contact_first_name} ${existingOrder.contact_last_name}`,
  existingOrder.id,
  updateOrderStatusDto.status
);
```

Note: Wire `EmailService` through your `CommonModule` and import it in `OrdersModule` for injection.

### Alternatives at a glance

- **Postmark**
  - **Why/when**: Excellent deliverability and speed for transactional email; simple API.
  - **Pricing**: $15/month for 10,000 emails.
  - **Test mode**: Sandbox server and test mode available.

- **Mailgun**
  - **Why/when**: Mature API, strong analytics, and robust infrastructure.
  - **Pricing**: Trial available; Basic plan about $15/month for 10,000 emails.
  - **Test mode**: Sandbox domain for safe testing.

- **Amazon SES**
  - **Why/when**: Lowest cost at scale; great if you already use AWS. Requires a bit more setup (domains, production access).
  - **Pricing**: ~$0.10 per 1,000 emails; free tier for first 12 months in some contexts.
  - **Test mode**: Mailbox simulator addresses for success/bounce/complaint tests.

- **SendGrid**
  - **Why/when**: Developer‑friendly, strong templates; widely used.
  - **Pricing**: Free 100 emails/day; paid from ~$19.95 for 50,000/month.
  - **Test mode**: Sandbox mode and testing tools available.

### Decision summary

- If you want the fastest path today with good templates and a free tier: pick **MailerSend**.
- If you prioritize deliverability reputation and ultra‑reliable transactional focus: **Postmark** is excellent.
- If cost-at-scale is the top priority and you’re comfortable with AWS setup: **Amazon SES** is the cheapest.

### Next steps

1) Create a MailerSend account, add and verify your sender domain, and generate an API key.
2) Add env vars (`MAILERSEND_API_KEY`, `MAIL_FROM_*`) and deploy secrets.
3) Add `EmailService` to `src/common/services/` and export it via `CommonModule`.
4) Inject the service in `OrdersService` and send emails on order placed and status change.


