/**
 * Email template generators for Stripe notifications
 */

export interface EmailData {
  subject: string;
  html: string;
  text: string;
}

export function generateUpgradeConfirmationEmail(
  userName: string,
  planType: "monthly" | "annual",
  amount: number,
  nextBillingDate: string
): EmailData {
  const frequency = planType === "monthly" ? "month" : "year";
  const nextBillingFormatted = new Date(nextBillingDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #0d1f12 0%, #091510 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
      .header h1 { margin: 0; font-size: 24px; }
      .content { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
      .feature-list { list-style: none; padding: 0; }
      .feature-list li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
      .feature-list li:last-child { border-bottom: none; }
      .feature-list li:before { content: "✓ "; color: #22C55E; font-weight: bold; margin-right: 8px; }
      .footer { text-align: center; color: #666; font-size: 12px; }
      .button { display: inline-block; background: #22C55E; color: #0f172a; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Welcome to MyStackd Pro! 🎉</h1>
      </div>

      <div class="content">
        <p>Hi ${userName},</p>

        <p>Your upgrade to <strong>MyStackd Pro</strong> is complete! We're excited to have you on board.</p>

        <h2 style="color: #22C55E; margin-top: 25px;">Your Subscription Details</h2>
        <p><strong>Plan:</strong> ${planType === "monthly" ? "Monthly" : "Annual"} (€${amount}/${frequency})</p>
        <p><strong>Next billing date:</strong> ${nextBillingFormatted}</p>
        <p><strong>Status:</strong> Active</p>

        <h2 style="color: #22C55E; margin-top: 25px;">You now have access to:</h2>
        <ul class="feature-list">
          <li>Multi-currency support & live FX rates</li>
          <li>Safe to spend calculator</li>
          <li>Tax estimates by country</li>
          <li>Advanced analytics dashboard</li>
          <li>Client portals & project tracking</li>
          <li>Recurring invoices & automation</li>
          <li>Webhook integrations</li>
          <li>Priority support</li>
        </ul>

        <p style="margin-top: 25px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Start Using Pro Features →</a>
        </p>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          You can manage your subscription and update your payment method anytime in Settings → Billing.
        </p>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} MyStackd. All rights reserved.</p>
        <p>Questions? Contact support at support@mystackd.com</p>
      </div>
    </div>
  </body>
</html>
  `.trim();

  const text = `
Welcome to MyStackd Pro!

Your upgrade to MyStackd Pro is complete!

Subscription Details:
Plan: ${planType === "monthly" ? "Monthly" : "Annual"} (€${amount}/${frequency})
Next billing date: ${nextBillingFormatted}
Status: Active

You now have access to:
✓ Multi-currency support & live FX rates
✓ Safe to spend calculator
✓ Tax estimates by country
✓ Advanced analytics dashboard
✓ Client portals & project tracking
✓ Recurring invoices & automation
✓ Webhook integrations
✓ Priority support

Get started: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

Manage your subscription anytime in Settings → Billing.

© ${new Date().getFullYear()} MyStackd
  `.trim();

  return {
    subject: "Welcome to MyStackd Pro! 🎉",
    html,
    text,
  };
}

export function generateCancellationConfirmationEmail(
  userName: string,
  cancellationDate: string
): EmailData {
  const dateFormatted = new Date(cancellationDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #f3f4f6; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px; border-left: 4px solid #ef4444; }
      .header h1 { margin: 0; font-size: 24px; }
      .content { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
      .footer { text-align: center; color: #666; font-size: 12px; }
      .button { display: inline-block; background: #22C55E; color: #0f172a; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Subscription Cancelled</h1>
      </div>

      <div class="content">
        <p>Hi ${userName},</p>

        <p>Your MyStackd Pro subscription has been cancelled.</p>

        <h2 style="color: #666; margin-top: 25px;">Cancellation Details</h2>
        <p><strong>Cancellation date:</strong> ${dateFormatted}</p>
        <p><strong>Access until:</strong> ${dateFormatted}</p>
        <p>You'll retain access to Pro features until the end of your current billing period.</p>

        <h2 style="color: #666; margin-top: 25px;">We'd love to have you back</h2>
        <p>If you cancelled due to issues or feedback, please don't hesitate to reach out at support@mystackd.com. We're always improving MyStackd based on user feedback.</p>

        <p style="margin-top: 25px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade" class="button">Reactivate Pro</a>
        </p>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Your account remains active on the Free plan with basic features.
        </p>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} MyStackd. All rights reserved.</p>
        <p>Questions? Contact support at support@mystackd.com</p>
      </div>
    </div>
  </body>
</html>
  `.trim();

  const text = `
Subscription Cancelled

Your MyStackd Pro subscription has been cancelled.

Cancellation Details:
Cancellation date: ${dateFormatted}
Access until: ${dateFormatted}

You'll retain access to Pro features until the end of your current billing period.

We'd love to have you back! If you cancelled due to issues or feedback, please reach out at support@mystackd.com.

Reactivate Pro: ${process.env.NEXT_PUBLIC_APP_URL}/upgrade

Your account remains active on the Free plan with basic features.

© ${new Date().getFullYear()} MyStackd
  `.trim();

  return {
    subject: "Your MyStackd Pro subscription has been cancelled",
    html,
    text,
  };
}
