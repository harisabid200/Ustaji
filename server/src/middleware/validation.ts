import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ── Schemas ─────────────────────────────────────────────────

export const ChatSchema = z.object({
  message: z.string().min(1, 'message cannot be empty').max(2000, 'message too long'),
  session_id: z.string().optional(),
  user_id: z.string().max(128).optional(),
  user_location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
});

export const ProviderRegisterSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(10).max(20),
  service_types: z.array(z.string()).min(1, 'At least one service type required').max(10),
  experience_years: z.number().int().min(0).max(60),
  bio: z.string().max(500).optional(),
  location: z.object({
    area: z.string().max(100),
    city: z.string().max(100),
  }),
  rate_card: z.record(z.string(), z.number().min(0)).optional(),
  certifications: z.array(z.string().max(100)).max(20).optional(),
  availability: z.array(z.string()).optional(),
});

export const RatingSchema = z.object({
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  review: z.string().max(1000).optional().default(''),
  category_ratings: z.record(z.string(), z.number().min(1).max(5)).optional(),
});

export const BookingStatusSchema = z.object({
  status: z.enum([
    'pending', 'confirmed', 'provider_en_route',
    'in_progress', 'completed', 'cancelled', 'disputed',
    'rated', 'delayed', 'rescheduled',
  ]),
});

export const DelaySchema = z.object({
  delay_minutes: z.number().int().min(1).max(480),
  reason: z.string().max(500).optional(),
});

// ── Middleware factory ───────────────────────────────────────

export function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((e: z.ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    // Replace body with the parsed (and stripped of extra fields) version
    req.body = result.data;
    next();
  };
}
