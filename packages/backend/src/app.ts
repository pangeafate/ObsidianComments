import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { publishRouter } from './routes/publish';
import { notesRouter } from './routes/notes';
import { authRouter } from './routes/auth';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Trust proxy for nginx reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', publishRouter);
app.use('/api/notes', notesRouter);
app.use('/api/auth', authRouter);

// Error handling
app.use(errorHandler);

export { app };