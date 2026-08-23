import nodemailer from 'nodemailer';
import { db } from '../db.js';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email using SMTP settings from the database.
 * Falls back to console log if SMTP is not configured.
 */
export async function sendEmail(opts: EmailOptions): Promise<void> {
  const siteRow = db.prepare("SELECT value FROM settings WHERE key='site'").get() as { value: string } | undefined;
  const site = siteRow ? JSON.parse(siteRow.value) : {};

  const host = site.smtp_host || process.env.SMTP_HOST;
  const port = site.smtp_port || process.env.SMTP_PORT || '587';
  const user = site.smtp_user || process.env.SMTP_USER;
  const pass = site.smtp_pass || process.env.SMTP_PASS;
  const fromName = site.smtp_from_name || site.brand || 'Design Studio';
  const fromEmail = site.smtp_from_email || user;

  if (!host || !user || !pass) {
    console.log(`\n[Email Stub - No SMTP Configured] 📨`);
    console.log(`  To:      ${opts.to}`);
    console.log(`  Subject: ${opts.subject}`);
    console.log(`----------------------------------------\n`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465, // true for 465, false for other ports
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    console.log(`[Email] Successfully sent to ${opts.to}`);
  } catch (err) {
    console.error(`[Email Error] Failed to send to ${opts.to}:`, err);
  }
}

// ---------------------------------------------------------------------------
// HTML Email Templates
// ---------------------------------------------------------------------------

const baseStyle = `font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #eaeaea; color: #333; direction: rtl;`;
const btnStyle = `display: inline-block; background: #cd45cd; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px;`;

/** Order confirmation email sent to client */
export function orderConfirmationEmail(opts: {
  clientName: string;
  orderNo: string;
  trackerUrl: string;
}): EmailOptions {
  return {
    to: '', // filled by caller
    subject: `تأكيد استلام طلبك ${opts.orderNo} 🎉`,
    html: `
      <div dir="rtl" style="${baseStyle}">
        <h2 style="color: #cd45cd; margin-top: 0;">مرحباً ${opts.clientName}،</h2>
        <p style="font-size: 16px; line-height: 1.6;">لقد استلمنا طلبك بنجاح ونحن متحمسون جداً للعمل معك! 🎉</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 15px;"><strong>رقم الطلب:</strong> ${opts.orderNo}</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">يمكنك متابعة حالة مشروعك، رفع إيصال الدفع، وتحميل الملفات والمراجعات مباشرة من خلال الرابط التالي:</p>
        <center>
          <a href="${opts.trackerUrl}" style="${btnStyle}">لوحة تتبع المشروع</a>
        </center>
        <p style="color: #888; font-size: 13px; margin-top: 40px; text-align: center; border-top: 1px solid #eaeaea; padding-top: 20px;">
          شكراً لاختيارك خدماتنا.
        </p>
      </div>
    `,
  };
}

/** Project Completion email */
export function projectCompleteEmail(opts: {
  clientName: string;
  orderNo: string;
  trackerUrl: string;
}): EmailOptions {
  return {
    to: '',
    subject: `اكتمل مشروعك! (${opts.orderNo}) 🚀`,
    html: `
      <div dir="rtl" style="${baseStyle}">
        <h2 style="color: #cd45cd; margin-top: 0;">تهانينا ${opts.clientName}! 🚀</h2>
        <p style="font-size: 16px; line-height: 1.6;">يسعدنا إخبارك بأن العمل على مشروعك (طلب رقم <b>${opts.orderNo}</b>) قد اكتمل تماماً.</p>
        <p style="font-size: 16px; line-height: 1.6;">يمكنك الآن الدخول إلى لوحة التتبع لتحميل الملفات النهائية والمخرجات الخاصة بك:</p>
        <center>
          <a href="${opts.trackerUrl}" style="${btnStyle}">تحميل الملفات النهائية</a>
        </center>
        <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">نتمنى أن تكون تجربتك معنا مميزة، ونتطلع للعمل معك مجدداً في المستقبل.</p>
        <p style="color: #888; font-size: 13px; margin-top: 40px; text-align: center; border-top: 1px solid #eaeaea; padding-top: 20px;">
          مع تحيات فريق العمل.
        </p>
      </div>
    `,
  };
}

/** New Revision Uploaded email */
export function revisionReadyEmail(opts: {
  clientName: string;
  orderNo: string;
  trackerUrl: string;
  revisionTitle: string;
}): EmailOptions {
  return {
    to: '',
    subject: `مراجعة جديدة متاحة لمشروعك (${opts.orderNo}) 📝`,
    html: `
      <div dir="rtl" style="${baseStyle}">
        <h2 style="color: #cd45cd; margin-top: 0;">مرحباً ${opts.clientName}،</h2>
        <p style="font-size: 16px; line-height: 1.6;">لقد قمنا برفع مراجعة جديدة لمشروعك بعنوان: <strong>${opts.revisionTitle}</strong>.</p>
        <p style="font-size: 16px; line-height: 1.6;">يُرجى الدخول إلى الرابط أدناه لمعاينة المراجعة وترك ملاحظاتك أو الموافقة عليها:</p>
        <center>
          <a href="${opts.trackerUrl}" style="${btnStyle}">عرض المراجعة</a>
        </center>
        <p style="color: #888; font-size: 13px; margin-top: 40px; text-align: center; border-top: 1px solid #eaeaea; padding-top: 20px;">
          بانتظار ملاحظاتك القيمة.
        </p>
      </div>
    `,
  };
}
