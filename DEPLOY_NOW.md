# Quick Deploy to Vercel

Follow these steps to deploy your app to Vercel now:

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## Step 2: Login to Vercel

```bash
vercel login
```

## Step 3: Deploy

```bash
vercel
```

When prompted:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **customer-churn-agent** (or your preferred name)
- In which directory is your code? **./** (just press Enter)
- Want to override settings? **N**

## Step 4: Set Environment Variables (Optional for first deploy)

```bash
vercel env add ENVIRONMENT
# Enter: production

vercel env add AUTO_CREATE_TABLES
# Enter: true
```

## Step 5: Deploy to Production

```bash
vercel --prod
```

That's it! Your app is now live on Vercel. 

You'll get a URL like: `https://customer-churn-agent-xxx.vercel.app`

## Verify Deployment

- Frontend: Visit your Vercel URL
- API Health: `https://your-url.vercel.app/api/health`
- API Docs: `https://your-url.vercel.app/api/docs`

For detailed instructions and database setup, see [DEPLOYMENT.md](./DEPLOYMENT.md)
