# CRM-DBS Deployment Checklist

## Pre-Deployment Checklist

### ✅ Backend (Render) Preparation
- [ ] All code changes committed to GitHub
- [ ] `backend/package.json` has correct start script: `"start": "node server.js"`
- [ ] `backend/server.js` is the entry point
- [ ] All dependencies listed in `package.json`
- [ ] MongoDB connection string ready
- [ ] JWT secret key generated

### ✅ Frontend (Vercel) Preparation
- [ ] All code changes committed to GitHub
- [ ] `frontend/vercel.json` configured correctly
- [ ] `frontend/.vercelignore` created
- [ ] Frontend builds successfully locally: `cd frontend && npm run build`
- [ ] API URL environment variable ready

---

## Step 1: Deploy Backend to Render

### 1.1 Create/Update Render Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select repository: `CRM-DBS` (or your repo name)

### 1.2 Configure Service Settings
- **Name:** `crm-dbs-backend`
- **Root Directory:** `crm-dbs/backend` (or `backend` if repo root is backend)
- **Environment:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** Free (or paid)

### 1.3 Set Environment Variables
Go to "Environment" tab and add:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_connection_string_here
JWT_SECRET=your_secure_random_secret_key_here
CORS_ORIGINS=https://your-frontend.vercel.app
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Optional Email Variables (if using email):**
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@crm.com
```

### 1.4 Deploy
- Click "Create Web Service"
- Wait for deployment (2-5 minutes)
- Note your backend URL: `https://crm-dbs.onrender.com` (or similar)

### 1.5 Verify Backend
Test these endpoints:
- Health: `https://your-backend.onrender.com/health`
- API Test: `https://your-backend.onrender.com/api/sales/test`

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Select repository: `CRM-DBS` (or your repo name)

### 2.2 Configure Project Settings
- **Framework Preset:** Create React App
- **Root Directory:** `frontend` (or `crm-dbs/frontend` if needed)
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `build` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

### 2.3 Set Environment Variables
Click "Environment Variables" and add:

```
REACT_APP_API_URL=https://your-backend.onrender.com/api
```

**Replace `your-backend.onrender.com` with your actual Render backend URL**

### 2.4 Deploy
- Click "Deploy"
- Wait for deployment (2-3 minutes)
- Note your frontend URL: `https://your-app.vercel.app`

---

## Step 3: Update Backend CORS

### 3.1 Update CORS Origins
1. Go back to Render Dashboard
2. Open your backend service
3. Go to "Environment" tab
4. Update `CORS_ORIGINS`:
   ```
   CORS_ORIGINS=https://your-frontend.vercel.app,https://crm-tool-ebon.vercel.app
   ```
   Replace `your-frontend.vercel.app` with your actual Vercel URL

### 3.2 Redeploy Backend
- Click "Manual Deploy" → "Deploy latest commit"
- Wait for deployment to complete

---

## Step 4: Final Verification

### 4.1 Test Frontend
- [ ] Visit your Vercel URL
- [ ] Login page loads correctly
- [ ] No console errors

### 4.2 Test Backend Connection
- [ ] Login works
- [ ] API calls succeed
- [ ] No CORS errors in browser console

### 4.3 Test Key Features
- [ ] Create a client
- [ ] Create a sale
- [ ] Create a deal
- [ ] View dashboard
- [ ] All features work correctly

---

## Troubleshooting

### Backend Issues

**500 Error on Root Path:**
- ✅ Fixed in latest code - ensure latest `server.js` is deployed

**MongoDB Connection Error:**
- Check `MONGODB_URI` is correct
- Ensure MongoDB Atlas allows connections from Render IPs (0.0.0.0/0)

**CORS Errors:**
- Verify `CORS_ORIGINS` includes your Vercel URL
- No trailing slashes in URLs
- Redeploy after CORS changes

### Frontend Issues

**Build Fails:**
- Check build logs in Vercel
- Ensure all dependencies in `package.json`
- Try building locally first: `npm run build`

**API Connection Fails:**
- Verify `REACT_APP_API_URL` is set correctly
- Check backend is running (test `/health` endpoint)
- Ensure backend URL includes `/api` suffix

**404 on Routes:**
- Verify `vercel.json` has SPA rewrite rules
- Check that `rewrites` section is correct

---

## Quick Deploy Commands

### Backend (Render)
- Automatic: Push to GitHub, Render auto-deploys
- Manual: Render Dashboard → Manual Deploy

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

Or use Vercel Dashboard for automatic deployments.

---

## Environment Variables Summary

### Backend (Render)
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
JWT_SECRET=your_64_char_secret_key
CORS_ORIGINS=https://your-app.vercel.app
```

### Frontend (Vercel)
```
REACT_APP_API_URL=https://your-backend.onrender.com/api
```

---

## Notes

- Render free tier: Services spin down after 15 min inactivity
- First request after spin-down: May take 30-60 seconds
- Vercel: Generous free tier, suitable for production
- Both platforms: Auto-deploy on git push (if connected)

---

## Support

If issues persist:
1. Check deployment logs in both platforms
2. Test backend endpoints directly (Postman/curl)
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly
