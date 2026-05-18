import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class CartScheduler {
  private readonly logger = new Logger(CartScheduler.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendAbandonedCartEmails() {
    this.logger.log('Running abandoned cart check...');
    const supabase = this.supabaseService.getClient();

    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();

    // Find cart items older than 24 hours, with user info, where email not already sent
    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        created_at,
        cart:carts!inner(
          id,
          user_id,
          abandoned_email_sent_at,
          user:users!inner(
            email,
            name
          )
        )
      `)
      .lt('created_at', twentyFourHoursAgo)
      .or('cart.abandoned_email_sent_at.is.null,cart.abandoned_email_sent_at.lt.' + twentyFourHoursAgo);

    if (error) {
      this.logger.error(`Failed to fetch abandoned carts: ${error.message}`);
      return;
    }

    // Group by cart to avoid duplicate emails
    const cartMap = new Map<string, { cartId: string; email: string; name: string }>();

    for (const item of cartItems || []) {
      const cart = item.cart as any;
      if (!cartMap.has(cart.id)) {
        cartMap.set(cart.id, {
          cartId: cart.id,
          email: cart.user.email,
          name: cart.user.name ?? 'Customer',
        });
      }
    }

    for (const { cartId, email, name } of cartMap.values()) {
      try {
        const cartUrl = `${process.env.FRONTEND_URL}/cart`;
        await this.mailService.sendAbandonedCartEmail(email, name, cartUrl);

        // Mark email as sent so we don't send it again
        await supabase
          .from('carts')
          .update({ abandoned_email_sent_at: new Date().toISOString() })
          .eq('id', cartId);

        this.logger.log(`Abandoned cart email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Abandoned cart email failed (non-critical): ${(error as Error).message}`);
        }
    }
  }
}