#!/bin/bash

# Fix CORS for Obsidian plugin
echo "Fixing CORS configuration for Obsidian..."

# Update the Express app CORS settings
cat > update-cors.js << 'EOF'
// Update CORS middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests from Obsidian app and our domain
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
EOF

echo "Updated CORS configuration in update-cors.js"
echo ""
echo "To apply this fix on your server:"
echo "1. SSH to your server: ssh root@46.101.189.137"
echo "2. cd /root/obsidian-comments"
echo "3. Edit src/app.ts and update the CORS configuration"
echo "4. Rebuild: docker-compose up -d --build"