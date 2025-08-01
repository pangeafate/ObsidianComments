#!/bin/bash

echo "🚀 Complete Obsidian Comments Deployment Script"
echo "Copy and paste this entire script into DigitalOcean Console"

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Certbot
apt install snapd -y
snap install core; snap refresh core
snap install --classic certbot
ln -sf /snap/bin/certbot /usr/bin/certbot

# Set up firewall
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable

# Create project directory
mkdir -p /root/obsidian-comments && cd /root/obsidian-comments

# Create package.json
cat > package.json << 'PACKAGE_EOF'
{
  "name": "obsidian-comments-backend",
  "version": "1.0.0",
  "description": "Backend API for Obsidian Comments sharing",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "compression": "^1.7.4",
    "cookie-parser": "^1.4.6"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/morgan": "^1.9.9",
    "@types/compression": "^1.7.5",
    "@types/cookie-parser": "^1.4.6",
    "typescript": "^5.3.3"
  }
}
PACKAGE_EOF

# Create tsconfig.json
cat > tsconfig.json << 'TSCONFIG_EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
TSCONFIG_EOF

# Create source directory and main files
mkdir -p src

# Create main application file
cat > src/index.ts << 'INDEX_EOF'
import { app } from './app';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Obsidian Comments API running on http://${HOST}:${PORT}`);
  console.log(`📋 Health check: http://${HOST}:${PORT}/api/health`);
});
INDEX_EOF

# Create Express app
cat > src/app.ts << 'APP_EOF'
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';

export const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://obsidiancomments.lakestrom.com'],
  credentials: true
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

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

export default app;
APP_EOF

# Create environment file
cat > .env << 'ENV_EOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

DB_PASSWORD=ObsidianSecure2025!
DATABASE_URL=postgresql://obsidian_user:${DB_PASSWORD}@postgres:5432/obsidian_comments
DATABASE_SSL=false

JWT_SECRET=super-secure-jwt-key-32-chars-long
JWT_EXPIRES_IN=30d
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://obsidiancomments.lakestrom.com/api/auth/google/callback

FRONTEND_URL=https://obsidiancomments.lakestrom.com
ALLOWED_ORIGINS=https://obsidiancomments.lakestrom.com,https://lakestrom.com

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
LOG_FORMAT=combined
MAX_NOTE_SIZE_MB=10
MAX_SHARES_PER_USER=100
SHARE_TOKEN_LENGTH=12
SESSION_SECRET=super-secure-session-key-32-chars
SESSION_MAX_AGE_DAYS=30
ENV_EOF

# Create Dockerfile
cat > Dockerfile << 'DOCKERFILE_EOF'
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --only=production
COPY src/ ./src/
RUN npm run build

FROM node:18-alpine AS production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs .env ./

USER nodejs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/index.js"]
DOCKERFILE_EOF

# Create docker-compose.yml
cat > docker-compose.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://obsidian_user:${DB_PASSWORD}@postgres:5432/obsidian_comments
      - JWT_SECRET=${JWT_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - FRONTEND_URL=${FRONTEND_URL}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=obsidian_comments
      - POSTGRES_USER=obsidian_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U obsidian_user -d obsidian_comments"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - app-network

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge
COMPOSE_EOF

# Create nginx.conf
cat > nginx.conf << 'NGINX_EOF'
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3000;
    }

    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_status 429;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    server {
        listen 80;
        server_name obsidiancomments.lakestrom.com;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name obsidiancomments.lakestrom.com;

        ssl_certificate /etc/letsencrypt/live/obsidiancomments.lakestrom.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/obsidiancomments.lakestrom.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            add_header Access-Control-Allow-Origin "https://obsidiancomments.lakestrom.com" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
            add_header Access-Control-Allow-Credentials "true" always;
            
            if ($request_method = 'OPTIONS') {
                return 204;
            }
        }

        location /api/health {
            proxy_pass http://backend;
        }

        location / {
            try_files $uri $uri/ /index.html;
            root /usr/share/nginx/html;
            index index.html;
        }
    }
}
NGINX_EOF

# Create database migrations
mkdir -p migrations
cat > migrations/001_initial_schema.sql << 'MIGRATION_EOF'
CREATE TABLE IF NOT EXISTS shares (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    owner_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shares_share_id ON shares(share_id);
CREATE INDEX IF NOT EXISTS idx_shares_owner_id ON shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
MIGRATION_EOF

echo "✅ All files created successfully!"
echo ""
echo "🔧 Now run these commands:"
echo "1. Get SSL certificate:"
echo "   certbot certonly --standalone -d obsidiancomments.lakestrom.com"
echo ""
echo "2. Start the application:"
echo "   docker-compose up -d --build"
echo ""
echo "3. Check status:"
echo "   docker-compose ps"
echo ""
echo "4. Test the API:"
echo "   curl https://obsidiancomments.lakestrom.com/api/health"