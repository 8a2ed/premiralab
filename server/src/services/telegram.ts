import { db } from '../db.js';

interface TelegramButton {
  text: string;
  url: string;
}

interface TelegramAlertOptions {
  buttons?: TelegramButton[];
}

/**
 * Send an instant Telegram notification to the studio owner
 */
export async function sendTelegramAlert(
  htmlText: string,
  options?: TelegramAlertOptions,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const siteRow = db.prepare("SELECT value FROM settings WHERE key='site'").get() as { value: string } | undefined;
    const site = siteRow ? JSON.parse(siteRow.value) : {};

    const botToken = site.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = site.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return { ok: false, error: 'لم يتم ضبط إعدادات بوت التيليغرام (Bot Token أو Chat ID مفقود)' };
    }

    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: htmlText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };

    if (options?.buttons && options.buttons.length > 0) {
      payload.reply_markup = {
        inline_keyboard: [options.buttons.map(b => ({ text: b.text, url: b.url }))],
      };
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      console.error('[Telegram Alert Error]', data.description);
      return { ok: false, error: data.description };
    }

    return { ok: true };
  } catch (err) {
    console.error('[Telegram Alert Exception]', err);
    return { ok: false, error: (err as Error).message };
  }
}

import fs from 'node:fs';
import path from 'node:path';

export async function sendTelegramDocument(filePath: string, caption?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const siteRow = db.prepare("SELECT value FROM settings WHERE key='site'").get() as { value: string } | undefined;
    const site = siteRow ? JSON.parse(siteRow.value) : {};

    const botToken = site.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = site.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return { ok: false, error: 'Telegram config missing' };
    }

    const form = new FormData();
    form.append('chat_id', chatId);
    if (caption) {
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
    }

    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer]);
    form.append('document', blob, path.basename(filePath));

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: form,
    });

    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      console.error('[Telegram Document Error]', data.description);
      return { ok: false, error: data.description };
    }
    return { ok: true };
  } catch (err) {
    console.error('[Telegram Document Exception]', err);
    return { ok: false, error: (err as Error).message };
  }
}
