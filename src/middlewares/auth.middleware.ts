import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, Permission } from '@prisma/client';

export interface AuthUserPayload {
  userId: string;
  academyId: string;
  role: Role;
  permissions: Permission[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ status: 'error', message: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev-secret-key'
    ) as AuthUserPayload;

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
};