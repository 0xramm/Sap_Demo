const nodemailer = require('nodemailer');

let cachedTransport;

/**
 * Lazily creates (and caches) a nodemailer transport.
 * - If SMTP_HOST is set, we use your real SMTP server (SendGrid, Gmail app
 *   password, SAP BTP's email service, etc).
 * - If not, we spin up a free, disposable Ethereal inbox so you can see the
 *   emails being sent without any setup - great for local testing.
 */
async function getTransport() {
  if (cachedTransport) return cachedTransport;

  if (process.env.SMTP_HOST) {
    cachedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransport = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    console.warn(
      '[mailer] No SMTP_HOST configured - using a temporary Ethereal test ' +
      'inbox. Watch the console for a "Preview email at" link after each send.'
    );
  }
  return cachedTransport;
}

async function sendMail({ to, subject, text }) {
  // Email delivery should never be the reason an approval/rejection fails -
  // if anything goes wrong (no internet, bad SMTP creds, etc.) we log the
  // message instead of throwing.
  try {
    const transport = await getTransport();
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || 'access-portal@example.com',
      to,
      subject,
      text
    });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log(`[mailer] Preview email at: ${preview}`);
    return info;
  } catch (err) {
    console.warn(`[mailer] Could not send email (${err.message}). Logging it instead:`);
    console.log(`[mailer]   To: ${to}\n[mailer]   Subject: ${subject}\n[mailer]   Body:\n${text}`);
    return null;
  }
}

module.exports = { sendMail };
