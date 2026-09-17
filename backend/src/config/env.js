const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

// Load .env file from backend or root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production', 'staging']).default('development'),
  PORT: z.string().default('5000').transform(val => parseInt(val, 10)),
  API_BASE_URL: z.string().default('http://localhost:5000/api/v1'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/docyra'),
  
  JWT_ACCESS_SECRET: z.string().min(16).default('development_jwt_access_secret_key_32_chars_min'),
  JWT_REFRESH_SECRET: z.string().min(16).default('development_jwt_refresh_secret_key_32_chars_min'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.string().default('12').transform(val => parseInt(val, 10)),

  CSRF_SECRET: z.string().default('development_csrf_secret_key_32_chars_min'),
  TOTP_ISSUER: z.string().default('Docyra'),

  SMTP_HOST: z.string().optional().default('smtp.gmail.com'),
  SMTP_PORT: z.string().optional().default('587').transform(val => parseInt(val, 10)),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('no-reply@docyra.app'),

  MSG91_AUTH_KEY: z.string().optional().default(''),
  MSG91_SENDER_ID: z.string().optional().default('DOCYRA'),

  AWS_ACCESS_KEY_ID: z.string().optional().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(''),
  AWS_S3_BUCKET: z.string().optional().default('docyra-uploads'),
  AWS_REGION: z.string().optional().default('ap-south-1'),

  RECAPTCHA_SECRET_KEY: z.string().optional().default('mock_recaptcha_secret'),
  SENTRY_DSN: z.string().optional().default(''),

  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:4200,https://patient.docyra.app,https://portal.docyra.app')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

const env = {
  ...parsed.data,
  ALLOWED_ORIGINS_ARRAY: parsed.data.ALLOWED_ORIGINS.split(',').map(s => s.trim())
};

module.exports = env;
