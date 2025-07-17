import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
export function authenticateAdminJWT(req:Request, res:Response, next:NextFunction) {
    const token = req.cookies.admintoken; // Use the correct cookie name!
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    } 
  
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
        if (typeof decoded === 'string') {
          res.status(403).json({ error: 'Invalid token payload' });
          return;
        }
        (req as any).user = decoded;
      next();
    } catch (err) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
  }

export function authorizeRoles(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      if (!user || !roles.includes(user.role)) {
        res.status(403).json({ error: 'Forbidden' });
        return; 
      }
      next();
    };
  }

  export const authenticateCompanyJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies?.token;
    if (!token) {
      res.status(401).json({ error: "No token provided" });
      return;
    }
  
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { companyId: string };
      const company = await prisma.company.findUnique({ where: { id: decoded.companyId } });
      if (!company) {
        res.status(401).json({ error: "Company not found" });
        return;
      }
      (req as any).company = company;
      next();
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  };
