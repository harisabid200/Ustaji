import { Request, Response, NextFunction } from 'express';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Centralized error handler.
 * - In production: returns a generic message so internal details don't leak.
 * - In development: returns the full error message for debugging.
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status: number = err.status || err.statusCode || 500;

  // Always log the full error server-side
  if (status >= 500) {
    console.error(`[ERROR] ${req.method} ${req.path}`, {
      status,
      message: err.message,
      stack: IS_PROD ? undefined : err.stack,
    });
  }

  // Safe client-facing response
  const clientMessage = IS_PROD && status >= 500
    ? 'An internal error occurred. Please try again later.'
    : err.message || 'Internal server error';

  res.status(status).json({
    error: clientMessage,
    ...(IS_PROD ? {} : { stack: err.stack }),
  });
}

/**
 * Wraps async route handlers so thrown errors are forwarded to errorHandler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
