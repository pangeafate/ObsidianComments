import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { rateLimiter } from './middleware/rate-limiter';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { notesRouter } from './routes/notes';
import { shareRouter } from './routes/share';
import { commentsRouter } from './routes/comments';
import { websocketRouter } from './routes/websocket';
import { config } from './config';
import { testConnection } from './db/connection';
import { CollaborationServer } from './websocket/server';

// Create Express app and HTTP server
export const app: Application = express();
export const httpServer = createServer(app);

// Initialize WebSocket server
let collaborationServer: CollaborationServer;
if (config.env !== 'test') {
  collaborationServer = new CollaborationServer(httpServer);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'app://obsidian.md',
      'https://obsidiancomments.lakestrom.com',
      'https://lakestrom.com',
      ...config.cors.allowedOrigins
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression
app.use(compression());

// Logging
if (config.env !== 'test') {
  app.use(morgan(config.logging.format));
}

// Rate limiting
app.use('/api', rateLimiter);

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/notes', notesRouter);
app.use('/api/notes', commentsRouter);
app.use('/api/websocket', websocketRouter);

// Share routes (for browser viewing)
app.use('/share', shareRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database connection
if (config.env !== 'test') {
  testConnection().then(connected => {
    if (connected) {
      console.log('✅ Database connection established');
    } else {
      console.error('❌ Database connection failed');
      process.exit(1);
    }
  });
}