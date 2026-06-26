require('dotenv').config();

const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(5000),

  MONGO_URI: z.string().url('MONGO_URI must be a valid URL'),

  ACCESS_TOKEN_SECRET: z
    .string()
    .min(32, 'ACCESS_TOKEN_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().int().positive().default(7),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().url().optional(),

  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().optional(),

  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_MODEL: z.string().default('nvidia/nemotron-3-super-120b-a12b:free'),
  OPENROUTER_EMBEDDING_MODEL: z.string().default('baai/bge-m3'),

  ML_SERVICE_URL: z.string().url().default('http://localhost:8000'),

  UPLOAD_MAX_SIZE_MB: z.coerce.number().int().positive().default(50),
});

let parsed;
try {
  parsed = envSchema.parse(process.env);
} catch (err) {
  console.error('Invalid environment variables:');
  if (err instanceof z.ZodError) {
    err.errors.forEach((e) => console.error(`  - ${e.path.join('.')}: ${e.message}`));
  }
  process.exit(1);
}

module.exports = { env: parsed };
