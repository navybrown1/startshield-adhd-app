# 🚀 StartShield - Supercharged ADHD Focus App

A **supercharged** desktop ADHD focus timer application with AI coaching, gamification, ambient sounds, and beautiful themes.

## ✨ New Supercharged Features

### 🤖 AI Focus Coach (Mistral-Powered)
- **Chat with your AI coach** for personalized productivity tips
- Get instant focus suggestions tailored to your situation
- Configurable via Mistral API key (bring your own key)
- Access via ⚙️ Settings or `Ctrl+Shift+A`

### 🎮 Gamification System
- **XP Points & Levels**: Earn 10 XP per minute of focus
- **Streak Tracking**: Build and maintain daily focus streaks
- **Achievement Badges**: Unlock badges for milestones
  - 🌟 First Session
  - 💪 Dedicated (10 sessions)
  - 🏆 Master (50 sessions)
  - 🔥 3 Day Streak
  - ⚡ Week Warrior (7 days)
  - 👑 Month Master (30 days)
  - ⭐ Level 5 Achiever
  - 💫 Level 10 Expert

### 🎨 Visual Theme Engine
- **4 Beautiful Themes**:
  - 🌙 Dark (default)
  - ☀️ Light
  - 🌊 Ocean (gradient)
  - 🌲 Forest (gradient)

### 🎵 Ambient Soundscapes
- Built-in focus sounds:
  - 🌧️ Rain
  - ☕ Café
  - 📻 White Noise
  - 🌳 Forest
- Adjustable volume control

### 📊 Enhanced Stats Dashboard
- View total sessions, streaks, level, and XP
- Track progress to next level
- See all earned badges
- Session history tracking

### 🔔 Smart Notifications
- Desktop notifications for session complete/break over
- Badge unlock celebrations with animations
- Gentle reminders and encouragement

### ⌨️ Keyboard Shortcuts
- `Ctrl+Shift+Space`: Start/Pause timer
- `Ctrl+Shift+A`: Open AI Coach

## 🛠️ Installation

```bash
npm install
npm start
```

## ⚙️ Setting Up AI Coach

1. Get your API key from [console.mistral.ai](https://console.mistral.ai)
2. Click the ⚙️ Settings button in the app
3. Enter your Mistral API key
4. Click "Save API Key"
5. Start chatting with your AI Focus Coach!

## 📁 File Structure

```
/workspace
├── main.js          # Electron main process with IPC handlers
├── preload.js       # Secure bridge between main and renderer
├── index.html       # App UI with modals
├── app.js           # Frontend logic with AI integration
├── styles.css       # Beautiful themed styles
├── package.json     # Dependencies
└── assets/
    └── icon.png     # App icon
```

## 🎯 How It Works

1. **Set a task** you want to focus on
2. **Choose a duration** (15, 25, 50, or 90 minutes)
3. **Start the timer** and focus
4. **Earn XP and badges** as you complete sessions
5. **Chat with AI Coach** when you need motivation or tips
6. **Build streaks** and level up your productivity

## 🔒 Privacy

- API keys stored locally in encrypted config
- All data stored locally on your machine
- No cloud sync (yet!)
- Your focus data stays private

## 🚀 Future Enhancements

- Cloud backup with end-to-end encryption
- Mobile app (React Native)
- Calendar integration
- Todoist/Notion sync
- Focus rooms for accountability partners
- Advanced analytics dashboard
- Custom sound uploads

## 📄 License

MIT License - Built with ❤️ for the ADHD community

---

**Transform your focus journey with AI-powered guidance and gamified productivity!** 🎯✨
