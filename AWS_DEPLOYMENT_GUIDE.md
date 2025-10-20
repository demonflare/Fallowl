# AWS EC2 Ubuntu Deployment Guide

This guide will walk you through deploying this Node.js/Express application on AWS EC2 Ubuntu.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Step 1: Launch EC2 Instance](#step-1-launch-ec2-instance)
- [Step 2: Connect to EC2](#step-2-connect-to-ec2)
- [Step 3: Install Dependencies](#step-3-install-dependencies)
- [Step 4: Setup PostgreSQL Database](#step-4-setup-postgresql-database)
- [Step 5: Deploy Application](#step-5-deploy-application)
- [Step 6: Configure Environment Variables](#step-6-configure-environment-variables)
- [Step 7: Build Application](#step-7-build-application)
- [Step 8: Setup PM2 Process Manager](#step-8-setup-pm2-process-manager)
- [Step 9: Configure Nginx Reverse Proxy](#step-9-configure-nginx-reverse-proxy)
- [Step 10: Setup SSL (Optional)](#step-10-setup-ssl-optional)
- [Useful Commands](#useful-commands)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- AWS account
- Basic knowledge of Linux command line
- Domain name (optional, for SSL)
- SSH client installed on your local machine

---

## Step 1: Launch EC2 Instance

1. **Login to AWS Console** and navigate to EC2 Dashboard

2. **Click "Launch Instance"**

3. **Configure Instance:**
   - **Name**: `my-nodejs-app` (or your preferred name)
   - **OS Image**: Ubuntu Server 22.04 LTS or 24.04 LTS (64-bit x86)
   - **Instance Type**: `t2.micro` (free tier) or `t3.small` (recommended for production)
   - **Key Pair**: Create new or use existing (download `.pem` file)
   - **Network Settings**:
     - Allow SSH (port 22)
     - Allow HTTP (port 80)
     - Allow HTTPS (port 443)
     - Allow Custom TCP (port 5000) for testing

4. **Storage**: 20-30 GB gp3 (recommended)

5. **Launch Instance**

6. **Save your `.pem` key file** securely (e.g., `my-key.pem`)

---

## Step 2: Connect to EC2

### Using SSH (Linux/Mac):

```bash
# Set proper permissions on your key file
chmod 400 my-key.pem

# Connect to your instance
ssh -i "my-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

### Using SSH (Windows):

Use PuTTY or Windows Terminal with the same command.

### Using EC2 Instance Connect:

From AWS Console, select your instance → Connect → EC2 Instance Connect

---

## Step 3: Install Dependencies

Once connected to your EC2 instance:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NVM for version management)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load NVM
source ~/.bashrc

# Install Node.js LTS (v20 recommended)
nvm install 20
nvm use 20

# Verify installation
node -v
npm -v

# Install Git
sudo apt install git -y

# Install build essentials (required for some npm packages)
sudo apt install build-essential -y
```

---

## Step 4: Setup PostgreSQL Database

### Option A: Local PostgreSQL on EC2

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to postgres user
sudo -i -u postgres

# Create database and user
psql
```

In PostgreSQL shell:

```sql
-- Create database
CREATE DATABASE yourappdb;

-- Create user
CREATE USER yourappuser WITH PASSWORD 'secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE yourappdb TO yourappuser;

-- Exit
\q
```

Exit postgres user:
```bash
exit
```

Your `DATABASE_URL` will be:
```
postgresql://yourappuser:secure_password_here@localhost:5432/yourappdb
```

### Option B: Use AWS RDS (Recommended for Production)

1. Go to AWS RDS Console
2. Create PostgreSQL database
3. Configure security group to allow EC2 instance access
4. Note the connection string from RDS dashboard

---

## Step 5: Deploy Application

```bash
# Navigate to home directory
cd ~

# Clone your repository (replace with your repo URL)
git clone https://github.com/yourusername/yourapp.git

# Or upload your code using SCP from your local machine:
# scp -i "my-key.pem" -r /path/to/your/app ubuntu@YOUR_EC2_IP:~/app

# Navigate to app directory
cd yourapp

# Install dependencies
npm install
```

---

## Step 6: Configure Environment Variables

```bash
# Create .env file from example
cp .env.example .env

# Edit .env file
nano .env
```

**Update the following critical variables:**

```bash
# Environment
NODE_ENV=production
PORT=5000

# Database - use your actual database URL
DATABASE_URL=postgresql://yourappuser:secure_password_here@localhost:5432/yourappdb

# Security - generate strong random values
SESSION_SECRET=run_this_node_-e_console.log_require_crypto_randomBytes_32_toString_hex
ENCRYPTION_KEY=run_this_node_-e_console.log_require_crypto_randomBytes_32_toString_hex
ADMIN_PASSWORD=your_strong_password

# CORS - use your EC2 public IP or domain
CLIENT_ORIGIN=http://YOUR_EC2_PUBLIC_IP

# Auth0 (if using)
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your_client_id
VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id

# Add other services as needed (Twilio, BunnyCDN, etc.)
```

**Generate secure keys:**

```bash
# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save and exit (Ctrl+X, then Y, then Enter)

---

## Step 7: Build Application

```bash
# Build the application
npm run build

# This creates the production build in the dist/ folder
```

---

## Step 8: Setup PM2 Process Manager

PM2 keeps your app running, restarts it on crashes, and starts on system boot.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your application with PM2
pm2 start npm --name "my-app" -- start

# Alternative: Start directly with node
# pm2 start dist/index.js --name "my-app"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup ubuntu

# Run the command that PM2 outputs (it will be something like):
# sudo env PATH=$PATH:/home/ubuntu/.nvm/versions/node/v20.x.x/bin pm2 startup ubuntu -u ubuntu --hp /home/ubuntu

# Check status
pm2 status

# View logs
pm2 logs my-app

# Monitor in real-time
pm2 monit
```

**Useful PM2 Commands:**

```bash
pm2 list              # List all apps
pm2 restart my-app    # Restart app
pm2 stop my-app       # Stop app
pm2 delete my-app     # Remove app from PM2
pm2 logs my-app       # View logs
pm2 flush             # Clear logs
```

---

## Step 9: Configure Nginx Reverse Proxy

Nginx will forward requests from port 80 to your app on port 5000.

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/myapp
```

**Add this configuration:**

```nginx
server {
    listen 80;
    server_name YOUR_EC2_PUBLIC_IP;  # or your-domain.com

    # Client body size limit (for file uploads)
    client_max_body_size 50M;

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
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

**Enable the configuration:**

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/

# Remove default configuration (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Check Nginx status
sudo systemctl status nginx
```

**Configure firewall:**

```bash
# Allow Nginx through firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow 'OpenSSH'
sudo ufw enable

# Check firewall status
sudo ufw status
```

---

## Step 10: Setup SSL (Optional but Recommended)

If you have a domain name, secure it with Let's Encrypt SSL certificate.

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)

# Test auto-renewal
sudo certbot renew --dry-run

# Certificate will auto-renew every 90 days
```

**Update your `.env` file to use HTTPS:**

```bash
nano .env
```

Change:
```
CLIENT_ORIGIN=https://yourdomain.com
```

Restart your app:
```bash
pm2 restart my-app
```

---

## Useful Commands

### Application Management

```bash
# View application logs
pm2 logs my-app

# Restart after code changes
cd ~/yourapp
git pull origin main
npm install
npm run build
pm2 restart my-app

# Check app status
pm2 status

# Monitor CPU/Memory
pm2 monit
```

### Nginx Management

```bash
# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Test configuration
sudo nginx -t
```

### Database Management

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Connect to your database
\c yourappdb

# List tables
\dt

# Exit
\q
```

### System Management

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
htop  # or top

# Check system logs
sudo journalctl -xe
```

---

## Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs my-app

# Check if port 5000 is in use
sudo lsof -i :5000

# Verify environment variables
pm2 env my-app
```

### Database connection errors

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U yourappuser -d yourappdb

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### Nginx 502 Bad Gateway

```bash
# Check if app is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart both services
pm2 restart my-app
sudo systemctl restart nginx
```

### Port 80/443 not accessible

```bash
# Check AWS Security Group rules (must allow HTTP/HTTPS)
# Check UFW firewall
sudo ufw status

# Allow Nginx
sudo ufw allow 'Nginx Full'
```

### Out of memory

```bash
# Check memory usage
free -h

# Restart app to free memory
pm2 restart my-app

# Consider upgrading instance type (t2.micro → t3.small)
```

---

## Updating Your Application

```bash
# SSH into your EC2 instance
ssh -i "my-key.pem" ubuntu@YOUR_EC2_IP

# Navigate to app directory
cd ~/yourapp

# Pull latest changes
git pull origin main

# Install new dependencies (if any)
npm install

# Rebuild application
npm run build

# Restart with PM2
pm2 restart my-app

# Check if everything is working
pm2 logs my-app
```

---

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use strong passwords** for database and admin accounts
3. **Keep system updated**: `sudo apt update && sudo apt upgrade`
4. **Enable firewall** and only open necessary ports
5. **Use SSH keys** instead of passwords
6. **Setup SSL/HTTPS** for production
7. **Regular backups** of database
8. **Monitor logs** for suspicious activity
9. **Use AWS IAM roles** instead of hardcoded credentials
10. **Enable AWS CloudWatch** for monitoring

---

## Monitoring & Maintenance

### Setup CloudWatch (Optional)

1. Install CloudWatch agent on EC2
2. Monitor CPU, memory, disk usage
3. Set up alarms for high resource usage

### Regular Maintenance

```bash
# Weekly: Update system packages
sudo apt update && sudo apt upgrade -y

# Weekly: Check disk space
df -h

# Monthly: Review PM2 logs
pm2 logs --lines 1000

# Monthly: Restart app to clear memory
pm2 restart my-app
```

---

## Need Help?

- **PM2 Documentation**: https://pm2.keymetrics.io/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **AWS EC2 Guide**: https://docs.aws.amazon.com/ec2/
- **Let's Encrypt**: https://letsencrypt.org/

---

**Your application is now live on AWS EC2!** 🚀

Access it at: `http://YOUR_EC2_PUBLIC_IP` or `https://yourdomain.com`
