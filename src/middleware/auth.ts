import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'No token providedddd' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
export function authenticateAdminJWT(req: Request, res: Response, next: NextFunction) {
    console.log('[Company Service] authenticateAdminJWT called');
    console.log('[Company Service] All cookies:', req.cookies);
    console.log('[Company Service] Headers cookie:', req.headers.cookie);
    
    const token = req.cookies.admintoken; 
    console.log('[Company Service] Admin token:', token ? 'Present' : 'Missing');
    
    if (!token) {
        console.log('[Company Service] No admin token found');
        res.status(401).json({ error: 'Unauthorized' });
        return;
    } 
  
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
        console.log('[Company Service] Token decoded successfully:', decoded);
        
        if (typeof decoded === 'string') {
          console.log('[Company Service] Invalid token payload - string');
          res.status(403).json({ error: 'Invalid token payload' });
          return;
        }
        
        (req as any).user = decoded;
        console.log('[Company Service] User set in request:', (req as any).user);
        next();
    } catch (err) {
      console.log('[Company Service] Token verification failed:', err);
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
  console.log('=== Company Auth Debug ===');
  console.log('Cookies:', req.cookies);
  
  const companyToken = req.cookies?.companyToken;
  console.log('Company Token:', companyToken ? 'Present' : 'Missing');
  
  if (!companyToken) {
    console.log('No token found in cookies');
    res.status(401).json({ error: "No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(companyToken, JWT_SECRET) as { id: string; email: string; companyName: string; role: string; userType: string };
    console.log('Decoded token:', decoded);
    
    const company = await prisma.company.findUnique({ 
      where: { id: decoded.id } 
    });
    console.log('Company found:', company ? `Yes (${company.companyName})` : 'No');
    
    if (!company) {
      console.log('Company not found in database');
      res.status(401).json({ error: "Company not found" });
      return;
    }
    
    (req as any).company = company;
    console.log('Authentication successful');
    next();
  } catch (error) {
    console.log('JWT verification failed:', error);
    res.status(401).json({ error: "Invalid token" });
  }
};
