const { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, ipcMain } = require('electron');
const path = require('node:path');

let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 720,
    minWidth: 380,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset', // Better look on macOS
    backgroundColor: '#ffffff'
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Create a simple icon or load placeholder
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    // Resize for tray standard
    icon = icon.resize({ width: 16, height: 16 });
  } catch (e) {
    console.error("Icon not found, tray will be empty");
  }

  tray = new Tray(icon || nativeImage.createEmpty());
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => { if(mainWindow) mainWindow.show(); } },
    { type: 'separator' },
    { label: 'Start/Pause Timer', click: () => { if(mainWindow) mainWindow.webContents.send('timer-action', 'toggle'); } },
    { label: 'Reset Timer', click: () => { if(mainWindow) mainWindow.webContents.send('timer-action', 'reset'); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit(); } }
  ]);
  
  tray.setToolTip('StartShield ADHD Focus');
  tray.setContextMenu(contextMenu);
  
  // Toggle window visibility on tray click
  tray.on('click', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // Global shortcut: Space to toggle start/pause if window is active
  // Let's use a more unique global shortcut to avoid interfering with normal typing
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (mainWindow) {
      mainWindow.webContents.send('timer-action', 'toggle');
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