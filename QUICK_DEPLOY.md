# Quick Deployment Guide

## 🚀 Fast Track Deployment

### Backend on Render (5 minutes)

1. **Go to Render Dashboard:** https://dashboard.render.com
2. **New Web Service** → Connect GitHub repo
3. **Settings:**
   - Root Directory: `crm-dbs/backend` or `backend`
   - Build: `npm install`
   - Start: `npm start`
4. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_secret_key
   CORS_ORIGINS=https://your-app.vercel.app
   ```
5. **Deploy** → Copy backend URL

### Frontend on Vercel (3 minutes)

1. **Go to Vercel Dashboard:** https://vercel.com
2. **New Project** → Import GitHub repo
3. **Settings:**
   - Root Directory: `frontend`
   - Framework: Create React App (auto-detected)
4. **Environment Variable:**
   ```
   REACT_APP_API_URL=https://your-backend.onrender.com/api
   ```
5. **Deploy** → Copy frontend URL

### Update CORS (2 minutes)

1. **Back to Render** → Environment tab
2. **Update CORS_ORIGINS** with Vercel URL
3. **Redeploy** backend

### ✅ Done!

Test your app at the Vercel URL.

---

## 📋 Pre-Deployment Checklist

- [ ] Code committed to GitHub
- [ ] Backend builds locally: `cd backend && npm install`
- [ ] Frontend builds locally: `cd frontend && npm run build`
- [ ] MongoDB connection string ready
- [ ] JWT secret generated

---

## 🔧 Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🌐 URLs After Deployment

- **Frontend:** `https://your-app.vercel.app`
- **Backend:** `https://your-backend.onrender.com`
- **Health Check:** `https://your-backend.onrender.com/health`

---

## ⚠️ Common Issues

**500 Error on Root:**
- ✅ Fixed in latest code - ensure latest `server.js` deployed

**CORS Errors:**
- Update `CORS_ORIGINS` in Render
- Include your Vercel URL
- Redeploy backend

**Build Fails:**
- Check logs in Vercel/Render
- Verify all dependencies in `package.json`
- Try building locally first

---

## 📚 Full Documentation

See `DEPLOYMENT_GUIDE.md` for detailed instructions.
See `DEPLOYMENT_CHECKLIST.md` for step-by-step checklist.
