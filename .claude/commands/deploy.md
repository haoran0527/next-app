---
name: Deploy
description: Deploy application to production server
category: Operations
tags: [deploy, deployment, production]
---

**Deployment Guidelines**

This project has automated deployment via `deploy.bat` for production deployment to server at 121.89.202.27.

**Prerequisites**
- SSH access to production server
- Server credentials configured
- Environment variables set on server
- Database migrations tested locally

**Deployment Process**

**1. Pre-Deployment Checks**
```bash
# Run tests
npm run test

# Build locally to verify
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Run linting
npm run lint
```

**2. Automated Deployment**
```bash
# Deploy using the automated script
./deploy.bat
```

This script will:
- Build the application locally
- Package the build output
- Upload to server via SCP
- Restart the application service
- Run database migrations if needed

**3. Post-Deployment Verification**
- Check application health at production URL
- Verify critical functionality works
- Check server logs for errors
- Test authentication flow
- Verify database connectivity

**Manual Deployment (if script fails)**

**Build and Package**
```bash
npm run build
tar -czf build.tar.gz .next/next-server/ next.config.js package.json prisma/
```

**Upload to Server**
```bash
scp build.tar.gz user@121.89.202.27:/path/to/app/
ssh user@121.89.202.27
cd /path/to/app
tar -xzf build.tar.gz
```

**Server-Side Operations**
```bash
# Install dependencies
npm install --production

# Run database migrations
npm run db:migrate

# Restart application
pm2 restart accounting-app
# or
systemctl restart accounting-app
```

**Rollback Procedure**

If deployment fails:
1. Identify the issue from logs
2. If critical, revert to previous version:
   ```bash
   pm2 revert accounting-app
   # or restore from backup
   ```
3. Fix the issue locally
4. Test thoroughly
5. Redeploy

**Environment Variables**

Ensure these are set on the production server:
- `POSTGRES_PASSWORD` - Database password
- `OPENAI_API_KEY` - DeepSeek API key
- `OPENAI_BASE_URL` - API base URL
- `NODE_ENV=production`
- Session secret (for cookie signing)

**Database Migrations**
- Always test migrations locally first
- Back up production database before major schema changes
- Use `npm run db:migrate` for production
- Never use `db:push` in production

**Monitoring**
- Check server logs: `pm2 logs accounting-app`
- Monitor error rates
- Verify database performance
- Check disk space and memory usage

**Troubleshooting**
- Build fails: Check Node.js version compatibility
- Runtime errors: Check server logs
- Database errors: Verify connection string and credentials
- 404 errors: Check basePath configuration (/note)
- 500 errors: Check API route protection and data access

**Safety Checklist**
- [ ] All tests pass locally
- [ ] Build succeeds without errors
- [ ] Database backed up (if schema changes)
- [ ] Environment variables verified
- [ ] Rollback plan prepared
- [ ] Deployment scheduled during low-traffic period
- [ ] Monitoring setup ready
