# AWS EC2 Deployment Checklist

Quick reference checklist for deploying to AWS EC2 Ubuntu.

## Pre-Deployment

- [ ] AWS account created
- [ ] Domain name registered (optional, for SSL)
- [ ] Code repository ready (GitHub, GitLab, etc.)
- [ ] All services configured (Auth0, Twilio, BunnyCDN, etc.)

## EC2 Setup

- [ ] Launch Ubuntu EC2 instance (t2.micro or larger)
- [ ] Configure Security Group:
  - [ ] SSH (22)
  - [ ] HTTP (80)
  - [ ] HTTPS (443)
  - [ ] Custom TCP (5000) for testing
- [ ] Download and secure `.pem` key file
- [ ] Assign Elastic IP (optional, for static IP)

## Server Configuration

- [ ] Connect via SSH: `ssh -i "key.pem" ubuntu@YOUR_IP`
- [ ] Update system: `sudo apt update && sudo apt upgrade -y`
- [ ] Install Node.js via NVM
- [ ] Install Git: `sudo apt install git -y`
- [ ] Install build tools: `sudo apt install build-essential -y`

## Database Setup

Choose one:

### Option A: Local PostgreSQL
- [ ] Install PostgreSQL: `sudo apt install postgresql postgresql-contrib -y`
- [ ] Create database and user
- [ ] Note connection string

### Option B: AWS RDS
- [ ] Create RDS PostgreSQL instance
- [ ] Configure security group for EC2 access
- [ ] Note connection endpoint

## Application Deployment

- [ ] Clone repository: `git clone YOUR_REPO_URL`
- [ ] Navigate to directory: `cd yourapp`
- [ ] Install dependencies: `npm install`
- [ ] Copy `.env.example` to `.env`: `cp .env.example .env`
- [ ] Edit `.env` and fill in ALL required variables:

### Critical .env Variables

```bash
# Required
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
SESSION_SECRET=<generate with crypto.randomBytes>
ENCRYPTION_KEY=<generate with crypto.randomBytes>
ADMIN_PASSWORD=<strong password>
CLIENT_ORIGIN=http://YOUR_IP or https://yourdomain.com

# Optional (if using)
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
VITE_AUTH0_DOMAIN=
VITE_AUTH0_CLIENT_ID=
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] Build application: `npm run build`
- [ ] Test build locally: `npm start`
- [ ] Verify app works at `http://YOUR_IP:5000`

## PM2 Process Manager

- [ ] Install PM2: `sudo npm install -g pm2`
- [ ] Start app: `pm2 start ecosystem.config.js --env production`
- [ ] OR: `pm2 start npm --name "my-app" -- start`
- [ ] Save config: `pm2 save`
- [ ] Setup startup: `pm2 startup ubuntu`
- [ ] Run the command PM2 outputs
- [ ] Verify: `pm2 status`

## Nginx Reverse Proxy

- [ ] Install Nginx: `sudo apt install nginx -y`
- [ ] Create config: `sudo nano /etc/nginx/sites-available/myapp`
- [ ] Add server configuration (see AWS_DEPLOYMENT_GUIDE.md)
- [ ] Enable site: `sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/`
- [ ] Remove default: `sudo rm /etc/nginx/sites-enabled/default`
- [ ] Test config: `sudo nginx -t`
- [ ] Restart Nginx: `sudo systemctl restart nginx`
- [ ] Configure firewall:
  - [ ] `sudo ufw allow 'Nginx Full'`
  - [ ] `sudo ufw allow 'OpenSSH'`
  - [ ] `sudo ufw enable`

## Testing

- [ ] Visit `http://YOUR_IP` in browser
- [ ] Test login functionality
- [ ] Test database operations
- [ ] Check PM2 logs: `pm2 logs`
- [ ] Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- [ ] Test all critical features

## SSL Setup (Optional but Recommended)

- [ ] Point domain to EC2 IP
- [ ] Install Certbot: `sudo apt install certbot python3-certbot-nginx -y`
- [ ] Get certificate: `sudo certbot --nginx -d yourdomain.com`
- [ ] Update `.env` CLIENT_ORIGIN to use https://
- [ ] Restart app: `pm2 restart my-app`
- [ ] Test auto-renewal: `sudo certbot renew --dry-run`

## Post-Deployment

- [ ] Setup monitoring (CloudWatch, PM2 monitoring)
- [ ] Configure automated backups for database
- [ ] Document server access procedures
- [ ] Create disaster recovery plan
- [ ] Setup alerts for downtime
- [ ] Schedule regular updates

## Maintenance Commands

### Update Application
```bash
cd ~/yourapp
git pull origin main
npm install
npm run build
pm2 restart my-app
```

### View Logs
```bash
pm2 logs my-app
sudo tail -f /var/log/nginx/error.log
```

### System Updates
```bash
sudo apt update && sudo apt upgrade -y
```

### Database Backup
```bash
pg_dump -U youruser yourdb > backup_$(date +%Y%m%d).sql
```

## Troubleshooting

If something goes wrong:

1. **Check PM2 status**: `pm2 status`
2. **Check PM2 logs**: `pm2 logs my-app`
3. **Check Nginx logs**: `sudo tail -f /var/log/nginx/error.log`
4. **Test database connection**: `psql -h localhost -U youruser -d yourdb`
5. **Check if port 5000 is running**: `sudo lsof -i :5000`
6. **Restart services**: `pm2 restart my-app && sudo systemctl restart nginx`

## Security Checklist

- [ ] Strong passwords for all accounts
- [ ] `.env` file never committed to git
- [ ] SSH key-based authentication only
- [ ] Firewall enabled with minimal open ports
- [ ] SSL/HTTPS enabled
- [ ] Regular security updates scheduled
- [ ] Database backups configured
- [ ] AWS IAM roles configured properly

## Performance Optimization

- [ ] Enable gzip compression in Nginx
- [ ] Configure caching headers
- [ ] Setup CDN if needed
- [ ] Monitor and optimize database queries
- [ ] Consider using AWS RDS for better database performance
- [ ] Use AWS CloudFront for static assets

---

## Quick Commands Reference

```bash
# SSH Connect
ssh -i "key.pem" ubuntu@YOUR_IP

# PM2 Commands
pm2 start ecosystem.config.js --env production
pm2 restart my-app
pm2 logs my-app
pm2 monit

# Nginx Commands
sudo systemctl restart nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# Database
sudo -u postgres psql
\c yourdb

# System
sudo apt update && sudo apt upgrade -y
df -h
free -h
```

---

**Deployment Complete!** ✅

Your app should now be live at:
- HTTP: `http://YOUR_EC2_IP`
- HTTPS: `https://yourdomain.com` (if SSL configured)
