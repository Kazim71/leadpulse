import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Set by resolveOrg. Present on every route mounted behind it. */
      organizationId?: string;
    }
  }
}

export {};
