/**
 * Email Service
 *
 * Currently runs in console-stub mode — all emails are logged to the terminal.
 *
 * To enable real Gmail sending:
 * 1. Uncomment the nodemailer block below
 * 2. Install: npm install nodemailer @types/nodemailer  (inside /server)
 * 3. Add to server/.env:
 *      SMTP_USER=premiralab@gmail.com
 *      SMTP_PASS=your-app-password   ← Google Account → Security → App Passwords
 */

// ─── Uncomment when ready ──────────────────────────────────────────────────────
// import nodemailer from 'nodemailer';
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
// });

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  const enabled = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

  if (!enabled) {
    // Console stub — useful for development
    console.log(`\n[email stub] ─────────────────────────────`);
    console.log(`  To:      ${opts.to}`);
    console.log(`  Subject: ${opts.subject}`);
    console.log(`─────────────────────────────────────────\n`);
    return;
  }

  // Real send (uncomment when nodemailer is installed)
  // await transporter.sendMail({
  //   from: `"Design Studio" <${process.env.SMTP_USER}>`,
  //   to: opts.to,
  //   subject: opts.subject,
  //   html: opts.html,
  // });
}

/** Order confirmation email sent to client */
export function orderConfirmationEmail(opts: {
  clientName: string;
  orderNo: string;
  trackerUrl: string;
}): EmailOptions {
  return {
    to: '', // filled by caller
    subject: `تأكيد طلبك ${opts.orderNo} — Design Studio`,
    html: `
      <div dir="rtl" style="font-family:Cairo,Arial,sans-serif;max-width:600px;margin:auto">
        <h2>مرحباً ${opts.clientName}،</h2>
        <p>تم استلام طلبك بنجاح 🎉</p>
        <p><strong>رقم الطلب:</strong> ${opts.orderNo}</p>
        <p>يمكنك متابعة حالة مشروعك في أي وقت من خلال الرابط أدناه:</p>
        <a href="${opts.trackerUrl}"
           style="display:inline-block;background:#cd45cd;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none">
          تتبع طلبك
        </a>
        <p style="color:#888;font-size:12px;margin-top:30px">Design Studio — premiralab@gmail.com</p>
      </div>
    `,
  };
}
