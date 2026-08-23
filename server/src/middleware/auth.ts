import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthRequest, JwtPayload } from '../types.js';

const getSecret = () => process.env.JWT_SECRET!; // validated at startup in index.ts

/** Requires a valid session cookie. Attaches req.user. */
export function auth(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.studio_session as string | undefined;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const payload = jwt.verify(token, getSecret()) as JwtPayload;
    req.user = { id: payload.id, username: payload.username, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

/** Requires req.user.role === 'admin'. Must be used after auth(). */
export function admin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
}

/** Requires a valid client session. Attaches req.client. */
export function clientAuth(req: any, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.client_session as string | undefined;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const payload = jwt.verify(token, getSecret()) as any;
    req.client = { id: payload.id, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
