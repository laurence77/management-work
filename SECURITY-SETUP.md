# Security Setup Guide for Celebrity Booking Platform

## Environment Configuration Security

### 🚨 CRITICAL: Never commit sensitive credentials to version control

This project uses secure environment variable management to protect sensitive information.

## Setup Instructions

### 1. Docker Environment Setup

1. **Copy the template file:**
   ```bash
   cp .env.docker .env.docker.local
   ```

2. **Edit `.env.docker.local` with your secure credentials:**
   ```bash
   # Change these values to secure passwords
   N8N_BASIC_AUTH_USER=your_secure_username
   N8N_BASIC_AUTH_PASSWORD=your_very_secure_password_here
   ```

3. **Generate strong passwords:**
   ```bash
   # Use this command to generate secure passwords
   openssl rand -base64 32
   ```

### 2. Backend Environment Setup

1. **Copy the template file:**
   ```bash
   cp backend/.env backend/.env.local
   ```

2. **Update with your production values:**
   - Database credentials
   - JWT secrets
   - API keys
   - SMTP credentials

### 3. Security Checklist

Before deployment, ensure:

- [ ] All `.env.local` files are created and configured
- [ ] Default passwords are changed to strong, unique values
- [ ] Sensitive files are added to `.gitignore`
- [ ] No hardcoded credentials remain in code
- [ ] SSL certificates are properly configured
- [ ] Database access is restricted
- [ ] API rate limiting is enabled

### 4. Environment File Structure

```
.env.docker              # Template file (safe to commit)
.env.docker.local        # Local overrides (NEVER commit)
.env.docker.production   # Production config (NEVER commit)
```

### 5. Docker Usage

```bash
# Start services with secure configuration
docker-compose up -d

# The docker-compose.yml will automatically load:
# 1. .env.docker.local (if exists) - highest priority
# 2. .env.docker (template) - fallback
```

### 6. Production Deployment

For production deployment:

1. Create `.env.docker.production` with production values
2. Use secure secret management (AWS Secrets Manager, HashiCorp Vault, etc.)
3. Enable SSL/TLS encryption
4. Configure firewall rules
5. Set up monitoring and logging

## Security Best Practices

### Password Requirements
- Minimum 16 characters
- Include uppercase, lowercase, numbers, and special characters
- Use unique passwords for each service
- Rotate passwords regularly

### Access Control
- Use principle of least privilege
- Enable multi-factor authentication where possible
- Regularly audit access logs
- Implement session timeouts

### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement proper input validation
- Regular security audits

## Emergency Procedures

If credentials are compromised:
1. Immediately rotate all affected passwords
2. Check access logs for unauthorized activity
3. Update all environment files
4. Restart all services
5. Notify security team

## Contact

For security issues, contact: security@bookmyreservation.org