# Deployment Guide - Vercel

This guide will help you deploy the Customer Churn Rescue Agent to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed: `npm install -g vercel`
3. Git repository (optional but recommended)

## Quick Deployment Steps

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from the project root**:
   ```bash
   cd d:\Sam\customer-churn-agent
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project or create new one
   - Set project name: `customer-churn-agent`
   - Select the root directory: `./`
   - Override settings? **No**

5. **Set Environment Variables** (in Vercel Dashboard or CLI):
   ```bash
   vercel env add DATABASE_URL
   vercel env add ENVIRONMENT
   vercel env add AUTO_CREATE_TABLES
   ```

   Recommended production values:
   - `ENVIRONMENT=production`
   - `AUTO_CREATE_TABLES=true`
   - `DATABASE_URL=sqlite+pysqlite:///./churn_rescue.db` (or use a hosted database)

6. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import Project in Vercel**:
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-detect the configuration from `vercel.json`
   - Add environment variables in the project settings
   - Click "Deploy"

## Environment Variables

Set these in your Vercel project settings (Project Settings → Environment Variables):

### Required:
- `ENVIRONMENT=production`
- `AUTO_CREATE_TABLES=true`

### Optional:
- `DATABASE_URL` - Database connection string (default: SQLite in /tmp)
- `REDIS_URL` - Redis connection string (for background tasks)
- `OPENAI_API_KEY` - For AI-powered features
- `OPENAI_MODEL=gpt-4o-mini`
- `LLM_ENABLED=true` - Enable AI features
- `CORS_ORIGINS` - Additional CORS origins (comma-separated)

## Important Notes

### Database Considerations

⚠️ **SQLite Limitation**: Vercel's serverless functions have ephemeral filesystems. SQLite data will be lost between deployments.

**Recommended Solutions**:
1. **Neon (Recommended)**: Free PostgreSQL database
   - Sign up at https://neon.tech
   - Get connection string
   - Set `DATABASE_URL=postgresql://user:pass@host/db`

2. **Supabase**: Free PostgreSQL with additional features
   - Sign up at https://supabase.com
   - Get connection string from project settings

3. **PlanetScale**: MySQL-compatible serverless database
   - Sign up at https://planetscale.com

### Background Workers

⚠️ **Worker Limitation**: Vercel serverless functions cannot run background workers (RQ).

If you need background task processing:
- Use **Vercel Cron Jobs** for scheduled tasks
- Use **Upstash QStash** for async task processing
- Or deploy workers separately to Railway/Render

### Redis

If using Redis features:
- Use **Upstash Redis** (serverless Redis, free tier available)
- Sign up at https://upstash.com
- Get connection string
- Set `REDIS_URL=redis://...`

## Verification

After deployment:

1. **Check Frontend**: Visit your Vercel URL (e.g., `https://your-app.vercel.app`)
2. **Check API**: Visit `https://your-app.vercel.app/api/health`
3. **Check API Docs**: Visit `https://your-app.vercel.app/api/docs`

## Troubleshooting

### Build Failures

1. **Frontend Build Fails**:
   - Check the build logs in Vercel dashboard
   - Ensure all dependencies are in `package.json`
   - Try building locally: `cd frontend && npm run build`

2. **Backend Import Errors**:
   - Verify all Python dependencies are in `requirements.txt`
   - Check that `api/index.py` can import from `backend/app`

3. **CORS Errors**:
   - Check that your frontend domain is allowed in CORS settings
   - Verify environment variables are set correctly

### Runtime Errors

1. **Database Connection Issues**:
   - Verify `DATABASE_URL` is set correctly
   - For PostgreSQL, ensure connection string includes `?sslmode=require`

2. **Timeout Errors**:
   - Vercel functions have 10s timeout (Hobby) or 60s (Pro)
   - Optimize slow endpoints or upgrade plan

## Custom Domain

To add a custom domain:
1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records as instructed
4. Update `CORS_ORIGINS` if needed

## Monitoring

- **Logs**: Check real-time logs in Vercel Dashboard → Deployments → View Function Logs
- **Analytics**: Available in Vercel Dashboard → Analytics
- **Performance**: Check Web Vitals in Analytics section

## Development Workflow

```bash
# Local development
cd frontend && npm run dev      # Frontend on localhost:5173
cd backend && uvicorn app.main:app --reload  # Backend on localhost:8000

# Deploy preview
vercel

# Deploy production
vercel --prod
```

## Next Steps

1. Set up a production database (Neon/Supabase recommended)
2. Configure Redis (Upstash recommended)
3. Enable AI features with OpenAI API key
4. Set up custom domain
5. Configure monitoring and alerts
6. Review security settings

## Support

- Vercel Docs: https://vercel.com/docs
- FastAPI Docs: https://fastapi.tiangolo.com
- Project Issues: Contact your development team

---

**Deployment Date**: 2026-07-10
**Last Updated**: 2026-07-10
