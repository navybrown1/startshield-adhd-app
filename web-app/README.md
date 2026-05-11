# StartShield Web App - Vercel Deployment

## 🚀 Deploy to Vercel in 3 Steps

### Step 1: Push to GitHub
```bash
cd web-app
git init
git add .
git commit -m "Initial web app commit"
# Push to your GitHub repository
```

### Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Select the `web-app` folder as the root directory

### Step 3: Add Environment Variables
In Vercel dashboard → Settings → Environment Variables:
- **Name**: `MISTRAL_API_KEY`
- **Value**: Your Mistral API key (get from console.mistral.ai)
- **Environment**: Production, Preview, Development

## 📁 Project Structure

```
web-app/
├── api/
│   ├── chat.js         # AI Chat endpoint
│   └── suggestion.js   # AI Suggestion endpoint
├── public/
│   ├── index.html      # Main HTML file
│   ├── styles.css      # All styles
│   └── app.js          # Frontend JavaScript
├── package.json        # Dependencies
└── vercel.json         # Vercel configuration
```

## ✨ Features Included

- 🍅 Pomodoro Timer with presets (15m, 25m, 50m, 90m)
- 🎮 Gamification (XP, Levels, Streaks, Badges)
- 🤖 AI Focus Coach powered by Mistral
- 🎨 4 Visual Themes (Dark, Light, Ocean, Forest)
- 🎵 Ambient Sounds (Rain, Café, White Noise, Forest)
- 📊 Progress Tracking & Statistics
- 🔔 Browser Notifications
- ⌨️ Keyboard Shortcuts

## 🎹 Keyboard Shortcuts

- `Ctrl/Cmd + Space` - Start/Pause timer
- `Ctrl/Cmd + R` - Reset timer
- `Ctrl/Cmd + Shift + A` - Open AI Coach
- `Escape` - Close modals

## 🌐 Local Development

```bash
cd web-app
npm install
npx vercel dev
```

Visit `http://localhost:3000` to test locally.

## 🔧 Customization

### Change AI Model
Edit `api/chat.js` and `api/suggestion.js`:
```javascript
model: 'mistral-small-latest'  // Options: mistral-tiny, mistral-small, mistral-medium, mistral-large
```

### Adjust XP System
In `public/app.js`, modify the `addXP()` function:
```javascript
const xpForNextLevel = userLevel * 500;  // Change multiplier
addXP(50);  // Change XP per session
```

### Add More Ambient Sounds
In `public/app.js`, update the `soundFiles` object:
```javascript
const soundFiles = {
    'rain': 'URL_TO_AUDIO_FILE',
    // Add more sounds here
};
```

## 📝 Notes

- All user data is stored in browser localStorage
- No backend database required
- API calls are proxied through Vercel serverless functions
- CORS is handled automatically
- Free tier compatible (Vercel Hobby + Mistral free tier)

## 🆘 Troubleshooting

**AI not working?**
- Check that MISTRAL_API_KEY is set in Vercel environment variables
- Verify your API key is valid at console.mistral.ai
- Check Vercel function logs in the dashboard

**Audio not playing?**
- Some browsers block autoplay - user interaction required first
- Ensure audio URLs are accessible (CORS enabled)

**Notifications not showing?**
- Browser must grant notification permission
- Works best on HTTPS (Vercel provides this automatically)

## 📄 License

MIT License - Same as original Electron app
