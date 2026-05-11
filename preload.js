// Preload scripts for Electron - Supercharged Version
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Timer controls
  sendTimerAction: (action) => ipcRenderer.send('timer-action', action),
  
  // Listen for timer updates from main process
  onTimerUpdate: (callback) => ipcRenderer.on('timer-action', (event, ...args) => callback(...args)),
  
  // Listen for desktop notifications
  onDesktopNotification: (callback) => ipcRenderer.on('desktop-notification', (event, data) => callback(data)),
  
  // Listen for AI coach open event
  onOpenAiCoach: (callback) => ipcRenderer.on('open-ai-coach', () => callback()),
  
  // API Key management
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),
  
  // User stats
  getUserStats: () => ipcRenderer.invoke('get-user-stats'),
  saveUserStats: (stats) => ipcRenderer.invoke('save-user-stats', stats),
  logFocusSession: (sessionData) => ipcRenderer.invoke('log-focus-session', sessionData),
  
  // Tasks management
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  saveTasks: (tasks) => ipcRenderer.invoke('save-tasks', tasks),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Notifications
  sendNotification: (title, body) => ipcRenderer.invoke('send-notification', { title, body }),
  
  // Utility
  getElectronVersion: () => process.versions.electron
});

// Expose environment info
contextBridge.exposeInMainWorld('env', {
  NODE_ENV: process.env.NODE_ENV || 'development'
});
