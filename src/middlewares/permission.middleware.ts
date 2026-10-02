import { Request, Response, NextFunction } from 'express';
import { Permission } from '@prisma/client';

export const requirePermission = (requiredPermission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    // 1. ADMIN has absolute access across all academy endpoints
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    // 2. COACH must have the specific permission in their permissions array
    if (req.user.role === 'COACH') {
      const hasPermission = req.user.permissions?.includes(requiredPermission);
      if (hasPermission) {
        next();
        return;
      }
    }

    // 3. Students or unpermitted coaches are blocked
    res.status(403).json({
      status: 'error',
      message: `Access denied. Requires permission: ${requiredPermission}`,
    });
  };
};