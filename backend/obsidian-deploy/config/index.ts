import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/obsidian_comments',
    ssl: process.env.DATABASE_SSL === 'true',
  },
  
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-secret-change-this',
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
    },
    session: {
      secret: process.env.SESSION_SECRET || 'dev-session-secret-change-this',
      maxAge: parseInt(process.env.SESSION_MAX_AGE_DAYS || '30', 10) * 24 * 60 * 60 * 1000,
    },
  },
  
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'dev',
  },
  
  share: {
    maxNoteSizeMB: parseInt(process.env.MAX_NOTE_SIZE_MB || '10', 10),
    maxSharesPerUser: parseInt(process.env.MAX_SHARES_PER_USER || '100', 10),
    tokenLength: parseInt(process.env.SHARE_TOKEN_LENGTH || '12', 10),
  },
  
  app: {
    name: 'Obsidian Comments',
    version: process.env.npm_package_version || '1.0.0',
  },
};