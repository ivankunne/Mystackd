/**
 * Email sending utility
 * Supports Resend, SendGrid, or other SMTP providers
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using configured provider
 * Currently supports Resend. Can be extended to support SendGrid, Mailgun, etc.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER || "resend";

  switch (provider) {
    case "resend":
      return sendEmailViaResend(options);
    case "sendgrid":
      return sendEmailViaSendGrid(options);
    default:
      console.warn(`Email provider '${provider}' not configured. Email not sent.`);
  }
}

/**
 * Send email via Resend (https://resend.com)
 * Requires RESEND_API_KEY environment variable
 */
async function sendEmailViaResend(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not configured");
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "noreply@mystackd.com",
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Resend API error: ${error.message}`);
    }

    console.log(`Email sent to ${options.to} via Resend`);
  } catch (error) {
    console.error("Failed to send email via Resend:", error);
    throw error;
  }
}

/**
 * Send email via SendGrid (https://sendgrid.com)
 * Requires SENDGRID_API_KEY environment variable
 */
async function sendEmailViaSendGrid(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error("SENDGRID_API_KEY not configured");
    return;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: options.to }],
          },
        ],
        from: {
          email: process.env.EMAIL_FROM || "noreply@mystackd.com",
        },
        subject: options.subject,
        content: [
          {
            type: "text/html",
            value: options.html,
          },
          {
            type: "text/plain",
            value: options.text || "",
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`SendGrid API error: ${error.errors?.[0]?.message || "Unknown error"}`);
    }

    console.log(`Email sent to ${options.to} via SendGrid`);
  } catch (error) {
    console.error("Failed to send email via SendGrid:", error);
    throw error;
  }
}
