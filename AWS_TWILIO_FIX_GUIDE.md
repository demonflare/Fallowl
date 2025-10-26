# AWS Production Deployment - Twilio Webhook Fix Guide

This guide addresses the `getaddrinfo EAI_AGAIN` DNS resolution errors and Twilio webhook 403 errors in AWS production environments.

## Problem Summary

When deployed to AWS, the application experiences:
1. **DNS Resolution Failures**: `Error: getaddrinfo EAI_AGAIN undefined`
2. **Twilio Webhook 403 Errors**: Signature validation failures
3. **Database Connection Errors**: Cannot resolve database hostname

## Root Causes

### 1. VPC Networking Issues
If your EC2 instance or container is in a VPC, it may not have internet access to reach:
- External database (Neon PostgreSQL)
- Twilio APIs
- Any other external services

### 2. Incorrect BASE_URL Configuration
Twilio webhooks require HTTPS URLs in production. Using HTTP causes signature validation to fail.

## Required Environment Variables for AWS

Set these environment variables on your AWS deployment:

```bash
# Required for all environments
DATABASE_URL=postgresql://user:password@host:5432/database
SESSION_SECRET=your-secure-random-secret-here
ENCRYPTION_KEY=your-secure-encryption-key-here

# AWS Production URL (CRITICAL!)
BASE_URL=https://app.fallowl.com

# Node Environment
NODE_ENV=production

# CORS Configuration
CLIENT_ORIGIN=https://app.fallowl.com

# Optional Twilio Configuration
# These are stored per-user in the database, but can be set globally if needed
```

### Generating Secure Keys

```bash
# Generate SESSION_SECRET (32+ characters)
openssl rand -hex 32

# Generate ENCRYPTION_KEY (32+ characters)
openssl rand -hex 32
```

## AWS VPC Configuration

### Option 1: Remove VPC (Simplest)

If you don't need VPC-specific resources (like RDS in a private subnet):

1. **EC2 Instance**: Launch in the default VPC with auto-assign public IP enabled
2. **Container/ECS**: Use `awsvpc` network mode without VPC configuration
3. **Lambda**: Remove VPC configuration entirely

### Option 2: VPC with NAT Gateway (Recommended)

If you need VPC resources:

#### Step 1: Network Architecture

```
┌─────────────────────────────────────────┐
│              VPC                        │
│                                         │
│  ┌────────────────┐  ┌──────────────┐  │
│  │ Public Subnet  │  │ Private Subnet│  │
│  │                │  │               │  │
│  │  NAT Gateway   │◄─┤  EC2/Container│  │
│  │       ↕        │  │               │  │
│  │  Internet GW   │  └──────────────┘  │
│  └────────────────┘                    │
│         ↕                               │
└─────────────────────────────────────────┘
          ↕
     Internet
```

#### Step 2: Create NAT Gateway

1. **Create Public Subnet** (if not exists):
   ```bash
   aws ec2 create-subnet \
     --vpc-id vpc-xxxxx \
     --cidr-block 10.0.1.0/24 \
     --availability-zone us-east-1a
   ```

2. **Allocate Elastic IP**:
   ```bash
   aws ec2 allocate-address --domain vpc
   ```

3. **Create NAT Gateway**:
   ```bash
   aws ec2 create-nat-gateway \
     --subnet-id subnet-xxxxx \  # Public subnet
     --allocation-id eipalloc-xxxxx
   ```

#### Step 3: Configure Route Tables

1. **Private Subnet Route Table**:
   ```bash
   # Add route to NAT Gateway
   aws ec2 create-route \
     --route-table-id rtb-xxxxx \
     --destination-cidr-block 0.0.0.0/0 \
     --nat-gateway-id nat-xxxxx
   ```

2. **Public Subnet Route Table**:
   ```bash
   # Add route to Internet Gateway
   aws ec2 create-route \
     --route-table-id rtb-xxxxx \
     --destination-cidr-block 0.0.0.0/0 \
     --gateway-id igw-xxxxx
   ```

#### Step 4: Enable VPC DNS

```bash
# Enable DNS resolution
aws ec2 modify-vpc-attribute \
  --vpc-id vpc-xxxxx \
  --enable-dns-support

# Enable DNS hostnames
aws ec2 modify-vpc-attribute \
  --vpc-id vpc-xxxxx \
  --enable-dns-hostnames
```

#### Step 5: Security Group Configuration

```bash
# Allow outbound HTTPS and DNS
aws ec2 authorize-security-group-egress \
  --group-id sg-xxxxx \
  --ip-permissions \
    IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges='[{CidrIp=0.0.0.0/0}]' \
    IpProtocol=tcp,FromPort=53,ToPort=53,IpRanges='[{CidrIp=0.0.0.0/0}]' \
    IpProtocol=udp,FromPort=53,ToPort=53,IpRanges='[{CidrIp=0.0.0.0/0}]'
```

## PM2 Configuration (EC2)

### Update Environment Variables

```bash
# Edit .env file
vim ~/Fallowl/.env
```

Add these variables:
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
SESSION_SECRET=your-session-secret-here
ENCRYPTION_KEY=your-encryption-key-here
BASE_URL=https://app.fallowl.com
CLIENT_ORIGIN=https://app.fallowl.com
```

### Restart Application

```bash
# Stop PM2
pm2 stop all

# Delete old processes
pm2 delete all

# Start with updated environment
cd ~/Fallowl
pm2 start npm --name "fallowl" -- start

# Save PM2 configuration
pm2 save

# Verify environment
pm2 env 0 | grep -E "DATABASE_URL|BASE_URL|ENCRYPTION_KEY"
```

## Verification Steps

### 1. Check DNS Resolution

```bash
# Test DNS from your server
nslookup ep-nameless-butterfly-adkxnx27-pooler.c-2.us-east-1.aws.neon.tech

# Or using dig
dig ep-nameless-butterfly-adkxnx27-pooler.c-2.us-east-1.aws.neon.tech
```

If this fails, your VPC networking is not configured correctly.

### 2. Check Database Connectivity

```bash
# Test PostgreSQL connection
psql "$DATABASE_URL" -c "SELECT 1"
```

### 3. Check Application Logs

```bash
# View PM2 logs
pm2 logs fallowl --lines 50

# Check for these successful messages:
# ✅ Database connection initialized successfully
# ✓ Production CORS origins configured
# ✓ URL configuration: https://app.fallowl.com
```

### 4. Test Twilio Webhooks

1. Make a test call or send a test SMS
2. Check PM2 logs for webhook requests:
   ```bash
   pm2 logs fallowl | grep twilio
   ```

3. Look for:
   - ✅ `Twilio webhook signature validated`
   - ❌ Avoid: `403 Forbidden` or `Invalid Twilio signature`

## Common Issues and Solutions

### Issue: Still getting DNS errors after NAT Gateway setup

**Solution**:
1. Verify NAT Gateway is in **public** subnet with Internet Gateway
2. Check route table association: private subnet → NAT Gateway
3. Wait 5-10 minutes for NAT Gateway to become available
4. Check security group allows outbound traffic

### Issue: Twilio webhooks showing 403 Forbidden

**Causes**:
- BASE_URL not set or using HTTP instead of HTTPS
- ENCRYPTION_KEY changes between restarts
- Webhook URLs in Twilio dashboard are outdated

**Solution**:
```bash
# Set permanent BASE_URL
export BASE_URL=https://app.fallowl.com
echo "BASE_URL=https://app.fallowl.com" >> ~/.bashrc

# Restart application
pm2 restart all

# Check logs for URL configuration
pm2 logs fallowl | grep "URL Configuration"
```

### Issue: Database connection works but queries fail

**Symptoms**: Connection test passes but actual queries timeout

**Solution**: This indicates network issues during data transfer
1. Check security group allows **ephemeral ports** (1024-65535) for return traffic
2. Verify Network ACLs (if used) allow bidirectional traffic
3. Increase connection timeout in database configuration

### Issue: Application starts but crashes immediately

**Check**:
```bash
# View error logs
pm2 logs fallowl --err --lines 100

# Common causes:
# - Missing SESSION_SECRET
# - Invalid DATABASE_URL format
# - Port 5000 already in use
```

## Cost Optimization

NAT Gateway costs approximately $0.045/hour + data processing fees (~$30-45/month).

### Alternative: VPC Endpoints

For AWS services only (not external APIs like Twilio):
```bash
# Create S3 endpoint (free)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxx \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-xxxxx
```

### Alternative: Dual-Stack Approach

1. **Public-facing app**: EC2 in public subnet (handles Twilio, external APIs)
2. **Database access**: Lambda in VPC (handles database queries)
3. **Communication**: App calls Lambda via API Gateway

## Testing Checklist

- [ ] Environment variables set correctly (DATABASE_URL, BASE_URL, etc.)
- [ ] BASE_URL uses HTTPS (not HTTP)
- [ ] DNS resolution works (`nslookup database-host`)
- [ ] Database connection successful (`psql $DATABASE_URL -c "SELECT 1"`)
- [ ] Application starts without errors
- [ ] Twilio webhooks return 200 OK (not 403 Forbidden)
- [ ] CORS configured for frontend domain
- [ ] PM2 configured to restart on reboot

## Support

If you continue experiencing issues:

1. **Collect diagnostics**:
   ```bash
   # Environment check
   pm2 env 0 > env_dump.txt
   
   # Recent logs
   pm2 logs fallowl --lines 200 > logs_dump.txt
   
   # Network check
   curl -I https://app.fallowl.com > network_check.txt
   ```

2. **Check application startup logs** for validation errors and warnings

3. **Verify Twilio configuration** in the application UI (Settings → Twilio)

## Quick Fix Summary

For immediate resolution:

```bash
# 1. Set environment variables
echo "BASE_URL=https://app.fallowl.com" >> ~/Fallowl/.env
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> ~/Fallowl/.env

# 2. Restart application
cd ~/Fallowl
pm2 restart all

# 3. Check logs
pm2 logs fallowl --lines 50
```

The application will now automatically:
- Convert HTTP BASE_URL to HTTPS
- Validate webhook signatures correctly
- Log DNS resolution errors with helpful diagnostics
- Test database connectivity on startup
