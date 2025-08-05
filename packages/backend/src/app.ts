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

// Security middleware
app.use(helmet());

// CORS configuration for Obsidian plugin support
const corsOptions = {
  origin: [
    'https://obsidiancomments.serverado.app',
    'http://localhost:3001', // Local development
    'http://localhost:5173', // Vite dev server
    'app://obsidian.md', // Obsidian desktop app
    /^capacitor:\/\/localhost/, // Obsidian mobile app
    /^https?:\/\/localhost:\d+$/ // Any localhost port for development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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