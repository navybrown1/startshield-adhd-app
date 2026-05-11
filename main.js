const { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, ipcMain, Notification } = require('electron');
const path = require('node:path');
const fs = require('fs');

let mainWindow;
let tray;

// Get user data path for storing settings
function getUserDataPath() {
  return app.getPath('userData');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 800,
    minWidth: 400,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e',
    show: false,
    frame: true,
    transparent: false
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    icon = icon.resize({ width: 16, height: 16 });
  } catch (e) {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => { if(mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: 'Start/Pause Timer', click: () => { if(mainWindow) mainWindow.webContents.send('timer-action', 'toggle'); } },
    { label: 'Reset Timer', click: () => { if(mainWindow) mainWindow.webContents.send('timer-action', 'reset'); } },
    { type: 'separator' },
    { label: 'AI Coach Chat', click: () => { if(mainWindow) mainWindow.webContents.send('open-ai-coach'); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit(); } }
  ]);
  
  tray.setToolTip('StartShield - Your AI Focus Guardian');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// IPC Handlers for AI and App Features
ipcMain.handle('get-api-key', () => {
  const configPath = path.join(getUserDataPath(), 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.mistralApiKey || '';
    }
  } catch (e) {
    console.error('Error reading config:', e);
  }
  return '';
});

ipcMain.handle('save-api-key', (event, apiKey) => {
  const configPath = path.join(getUserDataPath(), 'config.json');
  try {
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    config.mistralApiKey = apiKey;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    console.error('Error saving API key:', e);
    return false;
  }
});

ipcMain.handle('get-user-stats', () => {
  const statsPath = path.join(getUserDataPath(), 'stats.json');
  try {
    if (fs.existsSync(statsPath)) {
      return JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading stats:', e);
  }
  return {
    totalSessions: 0,
    totalFocusMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    level: 1,
    xp: 0,
    badges: [],
    sessionsToday: 0,
    lastSessionDate: null
  };
});

ipcMain.handle('save-user-stats', (event, stats) => {
  const statsPath = path.join(getUserDataPath(), 'stats.json');
  try {
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    return true;
  } catch (e) {
    console.error('Error saving stats:', e);
    return false;
  }
});

ipcMain.handle('get-tasks', () => {
  const tasksPath = path.join(getUserDataPath(), 'tasks.json');
  try {
    if (fs.existsSync(tasksPath)) {
      return JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading tasks:', e);
  }
  return [];
});

ipcMain.handle('save-tasks', (event, tasks) => {
  const tasksPath = path.join(getUserDataPath(), 'tasks.json');
  try {
    fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));
    return true;
  } catch (e) {
    console.error('Error saving tasks:', e);
    return false;
  }
});

ipcMain.handle('get-settings', () => {
  const settingsPath = path.join(getUserDataPath(), 'settings.json');
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading settings:', e);
  }
  return {
    theme: 'dark',
    soundEnabled: true,
    ambientSound: 'none',
    ambientVolume: 50,
    notificationsEnabled: true,
    breakReminders: true
  };
});

ipcMain.handle('save-settings', (event, settings) => {
  const settingsPath = path.join(getUserDataPath(), 'settings.json');
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (e) {
    console.error('Error saving settings:', e);
    return false;
  }
});

ipcMain.handle('send-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
  if (mainWindow) {
    mainWindow.webContents.send('desktop-notification', { title, body });
  }
});

ipcMain.handle('log-focus-session', (event, sessionData) => {
  const statsPath = path.join(getUserDataPath(), 'stats.json');
  const today = new Date().toDateString();
  
  let stats = {
    totalSessions: 0,
    totalFocusMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    level: 1,
    xp: 0,
    badges: [],
    sessionsToday: 0,
    lastSessionDate: null,
    sessionHistory: []
  };
  
  try {
    if (fs.existsSync(statsPath)) {
      stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading stats:', e);
  }

  // Update stats
  stats.totalSessions++;
  stats.totalFocusMinutes += sessionData.durationMinutes || 25;
  stats.xp += (sessionData.durationMinutes || 25) * 10;
  
  // Handle streaks
  if (stats.lastSessionDate === today) {
    stats.sessionsToday++;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (stats.lastSessionDate === yesterday.toDateString()) {
      stats.currentStreak++;
    } else {
      stats.currentStreak = 1;
    }
    stats.sessionsToday = 1;
  }
  stats.lastSessionDate = today;
  
  if (stats.currentStreak > stats.longestStreak) {
    stats.longestStreak = stats.currentStreak;
  }
  
  // Level up system (every 500 XP)
  stats.level = Math.floor(stats.xp / 500) + 1;
  
  // Add to history
  stats.sessionHistory = stats.sessionHistory || [];
  stats.sessionHistory.push({
    date: new Date().toISOString(),
    duration: sessionData.durationMinutes || 25,
    task: sessionData.task || 'Untitled'
  });
  
  // Keep only last 100 sessions
  if (stats.sessionHistory.length > 100) {
    stats.sessionHistory = stats.sessionHistory.slice(-100);
  }
  
  // Check for badges
  const newBadges = [];
  if (stats.totalSessions >= 1 && !stats.badges.includes('first_session')) newBadges.push('first_session');
  if (stats.totalSessions >= 10 && !stats.badges.includes('dedicated_10')) newBadges.push('dedicated_10');
  if (stats.totalSessions >= 50 && !stats.badges.includes('master_50')) newBadges.push('master_50');
  if (stats.currentStreak >= 3 && !stats.badges.includes('streak_3')) newBadges.push('streak_3');
  if (stats.currentStreak >= 7 && !stats.badges.includes('streak_7')) newBadges.push('streak_7');
  if (stats.currentStreak >= 30 && !stats.badges.includes('streak_30')) newBadges.push('streak_30');
  if (stats.level >= 5 && !stats.badges.includes('level_5')) newBadges.push('level_5');
  if (stats.level >= 10 && !stats.badges.includes('level_10')) newBadges.push('level_10');
  
  stats.badges = [...new Set([...stats.badges, ...newBadges])];
  
  try {
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    return { success: true, stats, newBadges };
  } catch (e) {
    console.error('Error saving stats:', e);
    return { success: false, error: e.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (mainWindow) {
      mainWindow.webContents.send('timer-action', 'toggle');
    }
  });
  
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (mainWindow) {
      mainWindow.webContents.send('open-ai-coach');
    }
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
