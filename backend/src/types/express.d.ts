import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        isSpecialUser?: boolean;
        subscription?: {
          status: string;
          plan: string;
        };
      };
    }
  }
}