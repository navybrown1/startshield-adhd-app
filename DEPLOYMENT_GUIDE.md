# StartShield Deployment Guide

## 📱 Two Versions Available

Your StartShield app now exists in two forms:

### 1. Desktop App (Electron) - `/workspace`
**Best for:** Power users who want native desktop features
- ✅ Global keyboard shortcuts
- ✅ System tray integration
- ✅ Native notifications
- ✅ Offline-first
- ❌ Requires installation

**Deploy as:** Downloadable .exe, .dmg, .AppImage files

```bash
cd /workspace
npm run build
```

### 2. Web App (Vercel) - `/workspace/web-app`
**Best for:** Quick access, mobile-friendly, sharing links
- ✅ Instant access via URL
- ✅ Works on any device with a browser
- ✅ No installation needed
- ✅ Automatic HTTPS
- ❌ No global shortcuts (browser limitation)
- ❌ Limited background functionality

**Deploy to:** Vercel (free hosting)

---

## 🚀 Deploy Web App to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. **Push to GitHub**
   ```bash
   cd /workspace/web-app
   git init
   git add .
   git commit -m "StartShield web app"
   # Push to your GitHub repository
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "Add New Project"
   - Import your repository
   - Set Root Directory to `web-app` (or import the web-app folder directly)

3. **Add API Key**
   - In Vercel dashboard → Settings → Environment Variables
   - Add: `MISTRAL_API_KEY` = your Mistral API key
   - Deploy!

### Option B: Via Vercel CLI

```bash
cd /workspace/web-app
npm install -g vercel
vercel login
vercel --prod
```

Then add environment variables in the dashboard.

---

## 🖥️ Build Desktop App

```bash
cd /workspace
npm install
npm run build
```

Output files will be in `/workspace/dist/`:
- Windows: `.exe`, `.msi`
- macOS: `.dmg`, `.pkg`
- Linux: `.AppImage`, `.deb`

Distribute via:
- GitHub Releases
- itch.io
- Direct download link
- Electron auto-updater

---

## 🔄 Keep Both Versions in Sync

When you make changes:

1. **Update core features** in both `/workspace/app.js` and `/workspace/web-app/public/app.js`
2. **Update styles** in both `/workspace/styles.css` and `/workspace/web-app/public/styles.css`
3. **API endpoints** are only needed for web app (desktop uses direct API calls)

---

## 💡 Recommended Strategy

**Launch with both versions:**

1. **Web App** (Primary)
   - Host on Vercel for free
   - Share link on social media
   - Let users try instantly
   - Collect feedback

2. **Desktop App** (Premium/Power Users)
   - Offer as downloadable installer
   - Highlight advanced features
   - Auto-update capability
   - Better performance

**Future:** Add cloud sync between devices using Supabase or Firebase.

---

## 📊 Cost Breakdown

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Vercel Hosting | ✅ 100GB/month | $20/month |
| Mistral AI | ✅ 2€ free credit | Pay per use |
| GitHub | ✅ Unlimited repos | $4/month |
| **Total** | **$0** | ~$25/month |

---

## 🆘 Troubleshooting

### Web App Issues

**AI not responding:**
```bash
# Check Vercel function logs
vercel logs <deployment-url>
```

**CORS errors:**
- Already handled in API routes
- Ensure you're calling `/api/chat` not external URL

### Desktop App Issues

**Build fails:**
```bash
rm -rf node_modules
npm install
npm run build
```

**API errors:**
- Desktop version requires user to enter API key in settings
- No server-side proxy (direct browser-to-API call)

---

## 🎯 Next Steps

1. ✅ Deploy web app to Vercel
2. ✅ Test with your Mistral API key
3. ✅ Share link with beta testers
4. ✅ Build desktop app installers
5. ✅ Create landing page
6. ✅ Submit to Product Hunt

Good luck! 🚀
