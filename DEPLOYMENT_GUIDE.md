# CRM-DBS Deployment Guide

This guide will help you deploy the CRM-DBS application with the frontend on Vercel and backend on Render.

## Prerequisites

- GitHub account
- Vercel account (free tier available)
- Render account (free tier available)
- MongoDB Atlas account (or your MongoDB connection string)

## Part 1: Backend Deployment on Render

### Step 1: Prepare Backend for Render

1. **Ensure your backend code is ready:**
   - All dependencies are in `package.json`
   - `server.js` is the entry point
   - Environment variables are configured

### Step 2: Deploy to Render

1. **Go to Render Dashboard:**
   - Visit [https://dashboard.render.com](https://dashboard.render.com)
   - Sign in or create an account

2. **Create a New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your backend code

3. **Configure the Service:**
   - **Name:** `crm-dbs-backend` (or your preferred name)
   - **Root Directory:** `crm-dbs/backend` (adjust if your structure differs)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid if needed)

4. **Set Environment Variables:**
   Click "Advanced" → "Add Environment Variable" and add:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secure_jwt_secret_key
   CORS_ORIGINS=https://your-frontend.vercel.app,https://crm-tool-ebon.vercel.app
   ```
   
   **Additional variables (if needed):**
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   EMAIL_FROM=noreply@crm.com
   ```

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note your backend URL (e.g., `https://crm-dbs.onrender.com`)

### Step 3: Verify Backend Deployment

1. **Test Health Endpoint:**
   ```
   GET https://your-backend-url.onrender.com/health
   ```
   Should return: `{"status":"ok",...}`

2. **Test API Endpoint:**
   ```
   GET https://your-backend-url.onrender.com/api/sales/test
   ```
   Should return: `{"message":"Sales API is working",...}`

## Part 2: Frontend Deployment on Vercel

### Step 1: Prepare Frontend for Vercel

1. **Verify Configuration:**
   - ✅ `vercel.json` is configured (already updated)
   - ✅ `.vercelignore` is created (already created)
   - The frontend uses `process.env.REACT_APP_API_URL`
   - We'll set this in Vercel environment variables

2. **Build the Frontend Locally (Recommended - for testing):**
   ```bash
   cd frontend
   npm install
   npm run build
   ```
   Verify the `build` folder is created successfully.
   
3. **Verify vercel.json:**
   - Should have `framework: "create-react-app"`
   - Should have SPA rewrite rules for React Router

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard

1. **Go to Vercel Dashboard:**
   - Visit [https://vercel.com](https://vercel.com)
   - Sign in or create an account

2. **Import Project:**
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Select the repository

3. **Configure Project:**
   - **Framework Preset:** Create React App (auto-detected from vercel.json)
   - **Root Directory:** `frontend` (or `crm-dbs/frontend` if needed)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `build` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)
   
   **Note:** Vercel will auto-detect these settings from `vercel.json`

4. **Set Environment Variables:**
   Click "Environment Variables" and add:
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com/api
   ```
   Replace `your-backend-url.onrender.com` with your actual Render backend URL.

5. **Deploy:**
   - Click "Deploy"
   - Wait for deployment to complete
   - Note your frontend URL (e.g., `https://your-app.vercel.app`)

#### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Navigate to Frontend Directory:**
   ```bash
   cd frontend
   ```

4. **Deploy:**
   ```bash
   vercel
   ```
   Follow the prompts:
   - Set up and deploy? **Yes**
   - Which scope? (Select your account)
   - Link to existing project? **No**
   - Project name? (Press Enter for default)
   - Directory? **./**
   - Override settings? **No**

5. **Set Environment Variables:**
   ```bash
   vercel env add REACT_APP_API_URL
   ```
   Enter: `https://your-backend-url.onrender.com/api`

6. **Redeploy with Environment Variables:**
   ```bash
   vercel --prod
   ```

### Step 3: Update Backend CORS

1. **Go back to Render Dashboard:**
   - Open your backend service
   - Go to "Environment" tab
   - Update `CORS_ORIGINS` to include your Vercel URL:
   ```
   CORS_ORIGINS=https://your-app.vercel.app,https://crm-tool-ebon.vercel.app
   ```
   Replace `your-app.vercel.app` with your actual Vercel frontend URL.

2. **Redeploy Backend:**
   - Click "Manual Deploy" → "Deploy latest commit"
   - Wait for deployment to complete

## Part 3: Final Verification

### Test the Complete Application

1. **Frontend:**
   - Visit your Vercel URL
   - Should load the login page

2. **Backend Connection:**
   - Try logging in
   - Check browser console for any CORS errors
   - Verify API calls are going to your Render backend

3. **Full Functionality Test:**
   - Login with admin credentials
   - Test creating a client
   - Test creating a sale
   - Verify all features work correctly

## Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Ensure `CORS_ORIGINS` in Render includes your Vercel URL
   - Check that URLs don't have trailing slashes
   - Verify the backend is redeployed after CORS changes

2. **API Connection Errors:**
   - Verify `REACT_APP_API_URL` in Vercel matches your Render backend URL
   - Check that the backend is running (visit `/health` endpoint)
   - Ensure the backend URL includes `/api` if needed

3. **Build Failures:**
   - Check build logs in Vercel dashboard
   - Ensure all dependencies are in `package.json`
   - Verify Node version compatibility

4. **Environment Variables Not Working:**
   - In Vercel, ensure variables start with `REACT_APP_` for React apps
   - Redeploy after adding environment variables
   - Check variable names match exactly (case-sensitive)

5. **Backend 500 Errors:**
   - Check Render logs for detailed error messages
   - Verify MongoDB connection string is correct
   - Ensure all required environment variables are set

## Environment Variables Summary

### Backend (Render)
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key
CORS_ORIGINS=https://your-frontend.vercel.app
```

### Frontend (Vercel)
```
REACT_APP_API_URL=https://your-backend.onrender.com/api
```

## Maintenance

### Updating the Application

1. **Push changes to GitHub:**
   ```bash
   git add .
   git commit -m "Update application"
   git push origin main
   ```

2. **Automatic Deployment:**
   - Vercel and Render will automatically detect changes
   - Both platforms will rebuild and redeploy

3. **Manual Deployment:**
   - Vercel: Go to dashboard → Project → Deployments → Redeploy
   - Render: Go to dashboard → Service → Manual Deploy

## Support

If you encounter issues:
1. Check deployment logs in both Vercel and Render dashboards
2. Verify all environment variables are set correctly
3. Test backend endpoints directly using Postman or curl
4. Check browser console for frontend errors

## Notes

- Render free tier services spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Consider upgrading to paid tier for always-on service
- Vercel free tier is generous and suitable for production use
