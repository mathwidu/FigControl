import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000),
  FIGCONTROL_EMAIL_PROVIDER: z.enum(['disabled', 'log', 'resend']).default('log'),
  FIGCONTROL_EMAIL_FROM: z.string().default('FigControl <noreply@notifications.matheusduarte.dev.br>'),
  FIGCONTROL_EMAIL_RESEND_API_KEY: z.string().optional(),
  FIGCONTROL_WEB_URL: z.string().url().default('http://localhost:3000'),
  FIGCONTROL_EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(1_440),
  FIGCONTROL_EMAIL_VERIFICATION_RESEND_COOLDOWN_MINUTES: z.coerce.number().int().positive().default(15),
  FIGCONTROL_PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(60),
  FIGCONTROL_PASSWORD_RESET_RESEND_COOLDOWN_MINUTES: z.coerce.number().int().positive().default(5),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().int().positive().default(3001)
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
