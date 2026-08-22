import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
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
  res.status(status).json({ error: message });
}
