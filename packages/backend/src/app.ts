import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { publishRouter } from './routes/publish';
import { notesRouter } from './routes/notes';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Trust proxy for nginx reverse proxy
app.set('trust proxy', 1);

// Security middleware - configure helmet to not interfere with CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin requests
}));

// CORS configuration for Obsidian plugin support
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://obsidiancomments.serverado.app',
      'http://obsidiancomments.serverado.app', // Production HTTP (redirects to HTTPS but needed for tests)
      'http://localhost:3001', // Local development
      'http://localhost:5173', // Vite dev server
      'http://localhost', // E2E testing
      'http://localhost:80', // E2E testing (explicit port)
      'app://obsidian.md', // Obsidian desktop app
    ];
    
    const isAllowed = allowedOrigins.includes(origin) ||
                     /^capacitor:\/\/localhost/.test(origin) || // Obsidian mobile app
                     /^https?:\/\/localhost:\d+$/.test(origin); // Any localhost port for development
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More permissive in development
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path.startsWith('/api/health');
  }
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', publishRouter);
app.use('/api', healthRouter);
app.use('/api/notes', notesRouter);
app.use('/api/auth', authRouter);

// Error handling
app.use(errorHandler);

export { app };