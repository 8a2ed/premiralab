import type { Request, Response, NextFunction } from 'express';
import { sendTelegramAlert } from '../services/telegram.js';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    return next(err);
  }
  console.error('[error]', err);
  const status = (err as { status?: number }).status ?? 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err instanceof Error
        ? err.message
        : String(err);
        
  if (status === 500) {
    const errorDetails = err instanceof Error ? err.stack || err.message : String(err);
    sendTelegramAlert(`🔴 <b>System Error (500)</b>\n<b>Route:</b> ${req.method} ${req.url}\n<b>Error:</b> <code>${errorDetails.slice(0, 1000)}</code>`).catch(() => {});
  }
  
  res.status(status).json({ error: message });
}
