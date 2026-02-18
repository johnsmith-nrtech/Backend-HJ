# 🚂 Railway Deployment Setup Guide

This guide will help you set up automatic deployment to Railway when you push code to your GitHub repository.

## 📋 Prerequisites

- ✅ Railway account (you're already invited as admin)
- ✅ GitHub repository with your code
- ✅ Node.js v20.18.0 (matches your local environment)

## 🚀 Step-by-Step Setup

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

This will open your browser to authenticate with Railway.

### 3. Connect Your Project to Railway

In your project directory, run:

```bash
railway init
```

- Select your existing Railway project (the one your client invited you to)
- Choose the service you want to deploy to

### 4. Get Your Railway Token

```bash
railway whoami
```

This will show your Railway token. **Copy this token** - you'll need it for GitHub Actions.

### 5. Set Up GitHub Secrets

1. Go to your GitHub repository
2. Click on **Settings** tab
3. Navigate to **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `RAILWAY_TOKEN`
6. Value: Paste the token you copied from step 4
7. Click **Add secret**

### 6. Configure Environment Variables in Railway

Go to your Railway dashboard and set these environment variables:

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
FRONTEND_URL=your_frontend_url
```

### 7. Test the Setup

1. **Create or switch to dev branch:**
   ```bash
   git checkout -b dev  # or git checkout dev if it exists
   ```

2. **Make a small change and push:**
   ```bash
   git add .
   git commit -m "test: railway deployment"
   git push origin dev
   ```

3. **Check GitHub Actions:**
   - Go to your repository → Actions tab
   - You should see a workflow running
   - It will first run tests, then deploy to Railway

4. **Check Railway Dashboard:**
   - Go to your Railway project dashboard
   - You should see a new deployment in progress

## 🔄 How It Works

### Automatic Deployment Triggers

- **Push to dev branch** → Runs tests + deploys to Railway
- **Pull request to dev branch** → Runs tests only (no deployment)

### Workflow Steps

1. **Test Phase:**
   - Install dependencies
   - Run ESLint
   - Run Jest tests
   - Build the application

2. **Deploy Phase (only on push to dev):**
   - Install Railway CLI
   - Deploy using your Railway token

## 🛠️ Manual Deployment

If you need to deploy manually:

```bash
# Using Railway CLI
railway up

# Using Docker (local testing)
docker build -t sopa-deal-backend .
docker run -p 3000:3000 sopa-deal-backend
```

## 📊 Monitoring Your Deployment

### Railway Dashboard
- **Logs**: View real-time application logs
- **Metrics**: Monitor CPU, memory, and network usage
- **Deployments**: Track deployment history and status

### Health Checks
The application includes built-in health checks that Railway monitors automatically.

## 🔧 Troubleshooting

### Common Issues

1. **Railway token invalid:**
   ```bash
   railway logout
   railway login
   # Get new token and update GitHub secret
   ```

2. **Build fails:**
   - Check the GitHub Actions logs
   - Ensure all environment variables are set in Railway

3. **Application won't start:**
   - Check Railway logs in the dashboard
   - Verify environment variables are correct

### Getting Help

- **Railway Logs**: Check the Railway dashboard for detailed error logs
- **GitHub Actions**: Check the Actions tab for build/deployment logs
- **Local Testing**: Test the Docker build locally before pushing

## 🎉 Success!

Once set up, every push to the `dev` branch will automatically:
1. ✅ Run code quality checks
2. ✅ Run tests
3. ✅ Deploy to Railway
4. ✅ Provide deployment status in GitHub

Your application will be live on Railway with zero-downtime deployments! 