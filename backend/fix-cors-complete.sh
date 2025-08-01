#!/bin/bash

echo "🔧 Fixing CORS for Obsidian plugin..."

# Create updated app.ts with proper CORS
cat > /root/obsidian-comments/src/app.ts << 'EOF'
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';

export const app: Application = express();

// Security middleware
app.use(helmet());

// CORS middleware - FIXED for Obsidian
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests from Obsidian app and our domains
    const allowedOrigins = [
      'app://obsidian.md',
      'https://obsidiancomments.lakestrom.com', 
      'https://lakestrom.com',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    // Allow requests with no origin (like mobile apps)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'User-Agent']
}));

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API endpoints
app.post('/api/notes/share', (req: Request, res: Response) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Note content cannot be empty' });
  }

  const shareId = Math.random().toString(36).substring(2, 15);
  const shareUrl = `${req.protocol}://${req.get('host')}/share/${shareId}`;
  
  res.status(201).json({
    shareId,
    shareUrl,
    createdAt: new Date().toISOString(),
  });
});

app.get('/api/notes/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  
  // Mock response for now
  res.json({
    shareId: token,
    content: '# Sample Note\n\nThis is a test note for obsidiancomments.lakestrom.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    permissions: {
      canEdit: false,
      canComment: false,
    },
  });
});

// Mock auth test endpoint (for now)
app.get('/api/auth/test', (req: Request, res: Response) => {
  res.json({
    valid: true,
    user: {
      email: 'test@example.com',
      name: 'Test User'
    },
    limits: {
      maxShares: 100,
      maxNoteSize: 10485760
    }
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

export default app;
EOF

echo "✅ Updated app.ts with fixed CORS configuration"
echo ""
echo "🔄 Rebuilding Docker container..."
cd /root/obsidian-comments
docker-compose up -d --build

echo ""
echo "✅ CORS fix applied! Obsidian plugin should now work properly."
echo ""
echo "Test with: curl -H 'Origin: app://obsidian.md' https://obsidiancomments.lakestrom.com/api/health"