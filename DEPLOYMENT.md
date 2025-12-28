# Deployment Configuration

## 🚀 Production Deployment Guide

### Prerequisites
- Node.js 18+ installed on server
- MongoDB Atlas cluster configured
- SSL certificate (for HTTPS)
- Domain name configured

### Environment Setup

1. **Create production environment file:**
```bash
cp .env.example .env
```

2. **Configure environment variables:**
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=generate-strong-32-char-secret
SESSION_SECRET=generate-strong-32-char-secret
ADMIN_SECRET_KEY=your-admin-registration-key
```

### Deployment Options

#### Option 1: PM2 (Recommended)
```bash
npm install -g pm2
pm2 start src/app.js --name "gdgc-backend"
pm2 save
pm2 startup
```

#### Option 2: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

#### Option 3: Direct Node
```bash
npm install --production
npm start
```

### Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Security Checklist
- [ ] Use HTTPS in production
- [ ] Set strong, unique environment variables
- [ ] Configure MongoDB Atlas IP whitelist
- [ ] Enable MongoDB authentication
- [ ] Set up firewall rules
- [ ] Configure rate limiting
- [ ] Enable CORS for specific domains only
- [ ] Regular security updates

### Monitoring & Logs
```bash
# PM2 monitoring
pm2 monit
pm2 logs gdgc-backend

# System monitoring
htop
df -h
free -m
```

### Backup Strategy
- MongoDB Atlas automated backups
- Environment file backup
- Application code in version control
- Regular database exports

### Performance Optimization
- Enable gzip compression
- Use CDN for static assets
- Database indexing
- Connection pooling
- Caching layer (Redis)

### Health Checks
```bash
# Basic health check
curl https://yourdomain.com/

# API health check
curl https://yourdomain.com/api/quiz/admin/all
```