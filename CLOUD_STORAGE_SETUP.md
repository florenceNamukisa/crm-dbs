# Profile Image Persistence Issue - Cloud Storage Solution

## Problem
Profile images are not persisting after server restarts/redeployments in production because:
1. Render.com (and most hosting platforms) use **ephemeral storage**
2. Uploaded files are stored locally on the server's filesystem
3. When the server restarts or redeploys, all local files are deleted
4. The database stores the image URL, but the actual file is gone

## Current Temporary Fix
- Added image error handling to show default icon if image fails to load
- Added note to users that photos are temporary in production

## Permanent Solution: Use Cloud Storage

### Recommended Options:

#### 1. **Cloudinary** (Easiest - Recommended)
- Free tier: 25GB storage, 25GB bandwidth/month
- Easy integration with Node.js
- Automatic image optimization and transformations

**Setup:**
```bash
npm install cloudinary multer-storage-cloudinary
```

**Environment Variables:**
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Code Changes:**
```javascript
// backend/config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'crm-profiles',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

export const upload = multer({ storage });
export default cloudinary;
```

#### 2. **AWS S3**
- More control and scalability
- Free tier: 5GB storage, 20,000 GET requests/month
- Requires more setup

#### 3. **Supabase Storage**
- Free tier: 1GB storage
- Easy integration
- Good for smaller projects

## Implementation Steps (Cloudinary)

1. **Sign up for Cloudinary**
   - Go to https://cloudinary.com
   - Create free account
   - Get your credentials from dashboard

2. **Install dependencies**
   ```bash
   cd crm-dbs/backend
   npm install cloudinary multer-storage-cloudinary
   ```

3. **Update environment variables**
   Add to `.env` and production environment:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Update upload route**
   Modify `backend/routes/upload.js` to use Cloudinary storage

5. **Test locally**
   Upload a profile image and verify it's stored on Cloudinary

6. **Deploy to production**
   Set environment variables on Render.com and redeploy

## Benefits of Cloud Storage
✅ Images persist across deployments
✅ Faster image loading (CDN)
✅ Automatic backups
✅ Image optimization
✅ Scalable storage
✅ No server disk space usage

## Cost Comparison
- **Cloudinary Free**: 25GB storage, 25GB bandwidth
- **AWS S3 Free**: 5GB storage, 20K GET requests
- **Supabase Free**: 1GB storage

For a CRM with ~100 users, Cloudinary free tier is more than sufficient.
