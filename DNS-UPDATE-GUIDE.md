# How to Update DNS A Record for obsidiancomments.serverado.app

## 🔍 Find Your DNS Provider

The domain `obsidiancomments.serverado.app` is a subdomain of `serverado.app`. You need to update the DNS where `serverado.app` is managed.

### Common DNS Providers to Check:

1. **Domain Registrar** (where you bought the domain)
   - GoDaddy, Namecheap, Google Domains, etc.

2. **Cloud Providers**
   - Cloudflare
   - AWS Route 53
   - DigitalOcean DNS
   - Google Cloud DNS
   - Azure DNS

3. **Hosting Providers**
   - cPanel/WHM
   - Plesk
   - Custom hosting panel

## 🎯 Steps to Update

### 1. Identify Your DNS Provider

Check these locations:
- **Email records** - Look for domain purchase confirmations
- **Browser bookmarks** - DNS management panels you've used
- **Account logins** - Cloud provider accounts

### 2. Access DNS Management

Look for sections named:
- "DNS Management"
- "DNS Zone"
- "Domain Settings"
- "Name Servers"

### 3. Find the A Record

Look for:
- **Type**: A
- **Name**: `obsidiancomments` or `obsidiancomments.serverado.app`
- **Value/Points to**: Currently shows `198.18.0.15`

### 4. Update the Record

Change the **Value/IP Address** from:
```
198.18.0.15
```

To:
```
138.197.187.49
```

## 📋 Common DNS Panel Instructions

### Cloudflare
1. Login to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select `serverado.app` domain
3. Go to **DNS** tab
4. Find A record for `obsidiancomments`
5. Click **Edit** and change IP to `138.197.187.49`
6. Click **Save**

### DigitalOcean
1. Login to [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Go to **Networking** → **Domains**
3. Select `serverado.app`
4. Find A record for `obsidiancomments`
5. Edit and change to `138.197.187.49`

### AWS Route 53
1. Login to AWS Console
2. Go to **Route 53** → **Hosted zones**
3. Select `serverado.app`
4. Find A record for `obsidiancomments`
5. Edit and change value to `138.197.187.49`

### GoDaddy/Namecheap
1. Login to your registrar account
2. Go to **Domain Management** or **DNS Management**
3. Select `serverado.app`
4. Find A record for `obsidiancomments`
5. Edit and change to `138.197.187.49`

## ⏱️ Propagation Time

After updating:
- **TTL**: Usually 300-3600 seconds (5 minutes to 1 hour)
- **Global propagation**: Up to 24 hours (usually much faster)

## 🧪 Verify the Change

### Check DNS propagation:
```bash
# Command line
nslookup obsidiancomments.serverado.app

# Should return: 138.197.187.49
```

### Online tools:
- [whatsmydns.net](https://whatsmydns.net) - Check global propagation
- [dnschecker.org](https://dnschecker.org) - Verify DNS changes

## 🚨 If You Can't Find DNS Management

### Check with your hosting provider:
1. **Email support** - Ask where DNS is managed for `serverado.app`
2. **Check all accounts** - Cloud providers, hosting, registrars
3. **Look for invoices** - Domain and hosting bills often mention DNS

### Alternative: Use your server's IP directly for testing
If you can't find DNS management immediately, you can test the deployment using the IP:
- Add entry to your local hosts file: `138.197.187.49 obsidiancomments.serverado.app`
- This allows local testing while you locate DNS management

## 📞 Need Help?

If you're still having trouble finding where to update DNS:
1. Check your email for domain registration confirmations
2. Look at any cloud provider accounts you have
3. Contact the company that manages your `serverado.app` domain

Once the DNS is updated to `138.197.187.49`, the deployment will work perfectly with automatic SSL certificates!