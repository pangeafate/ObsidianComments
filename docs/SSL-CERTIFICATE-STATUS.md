# SSL Certificate Status

## Current Status ✅

The ObsidianComments service is **fully secured with valid Let's Encrypt SSL certificates**.

### Certificate Details
- **Domain**: obsidiancomments.serverado.app
- **Issuer**: Let's Encrypt (E6)
- **Valid From**: August 10, 2025 16:23:05 GMT
- **Valid Until**: November 8, 2025 16:23:04 GMT  
- **Days Remaining**: ~89 days (as of August 11, 2025)
- **Certificate Type**: Domain Validated (DV)
- **Key Algorithm**: RSA 2048-bit

### SSL Configuration ✅
- **TLS Version**: TLSv1.2, TLSv1.3
- **Cipher Suite**: Modern secure ciphers (ECDHE-RSA-AES128-GCM-SHA256, etc.)
- **HSTS**: Enabled (max-age=31536000; includeSubDomains)
- **Security Headers**: Full suite implemented
  - X-Frame-Options: SAMEORIGIN  
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin

### Services Protected ✅
- **Frontend**: https://obsidiancomments.serverado.app (HTTP/2)
- **API Endpoints**: https://obsidiancomments.serverado.app/api/* 
- **WebSocket**: wss://obsidiancomments.serverado.app/ws (Secure WebSocket)
- **Health Checks**: https://obsidiancomments.serverado.app/api/health

## Certificate Management

### Automatic Renewal Setup
The following files are available for certificate management:

1. **Initial Setup**: `scripts/setup-letsencrypt.sh`
2. **Simple Setup**: `scripts/setup-letsencrypt-simple.sh`  
3. **Renewal Check**: `scripts/ssl-renewal-check.sh` (NEW)

### Recommended Cron Job
To set up automatic renewal checking, add to server crontab:

```bash
# Check SSL certificate renewal every Sunday at midnight
0 0 * * 0 /path/to/scripts/ssl-renewal-check.sh
```

### Manual Renewal
If needed, certificates can be manually renewed:

```bash
# Run the renewal check script
./scripts/ssl-renewal-check.sh

# Or directly renew with certbot
docker run --rm \
  -v obsidiancomments_ssl_certs:/etc/letsencrypt \
  -v obsidiancomments_certbot_webroot:/var/www/certbot \
  certbot/certbot:latest \
  renew --webroot --webroot-path /var/www/certbot
```

### Certificate Verification
You can verify the certificate status:

```bash
# Check certificate details
openssl s_client -servername obsidiancomments.serverado.app \
  -connect obsidiancomments.serverado.app:443 < /dev/null 2>/dev/null \
  | openssl x509 -noout -text

# Check expiration date
openssl s_client -servername obsidiancomments.serverado.app \
  -connect obsidiancomments.serverado.app:443 < /dev/null 2>/dev/null \
  | openssl x509 -noout -dates
```

## Docker Volume Configuration

The SSL certificates are stored in Docker volumes:
- **ssl_certs**: Contains active certificates (fullchain.pem, privkey.pem)
- **certbot_webroot**: Used for Let's Encrypt domain validation
- **obsidiancomments_ssl_certs**: Let's Encrypt certificate storage
- **obsidiancomments_certbot_webroot**: Challenge verification files

## Security Compliance ✅

The current SSL configuration meets modern security standards:
- **A+ Rating**: SSL Labs would rate this A+ 
- **Perfect Forward Secrecy**: Enabled
- **Mixed Content**: Not allowed
- **Secure Cookies**: Enforced via HTTPS
- **WebSocket Security**: WSS protocol enforced

## Troubleshooting

### Common Issues
1. **Certificate Not Found**: Check if volumes are properly mounted
2. **Permission Errors**: Ensure privkey.pem has 600 permissions
3. **Nginx Won't Start**: Verify certificate files exist in volume
4. **Renewal Fails**: Check certbot_webroot volume accessibility

### Health Check Commands
```bash
# Test HTTPS connectivity
curl -I https://obsidiancomments.serverado.app

# Test WebSocket SSL
curl -v --http1.1 -H "Connection: upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
  wss://obsidiancomments.serverado.app/ws

# Check certificate in nginx container  
docker exec obsidiancomments-nginx-1 ls -la /etc/nginx/ssl/
```

## Summary

✅ **SSL/TLS Status: FULLY OPERATIONAL**
- Valid Let's Encrypt certificates installed
- Automatic HTTPS redirection working  
- Secure WebSocket (WSS) connections enabled
- Modern TLS configuration with security headers
- Certificate expires November 8, 2025 (89+ days remaining)
- Renewal infrastructure in place