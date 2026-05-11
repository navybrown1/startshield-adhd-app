// Preload scripts for Electron
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Timer controls
  sendTimerAction: (action) => ipcRenderer.send('timer-action', action),
  
  // Listen for timer updates from main process (if needed)
  onTimerUpdate: (callback) => ipcRenderer.on('timer-update', (event, ...args) => callback(...args)),
  
  // Other desktop integrations can be added here
  
  // Utility to get Electron version
  getElectronVersion: () => process.versions.electron
});

// Example of exposing a safe version of environment variables
contextBridge.exposeInMainWorld('env', {
  NODE_ENV: process.env.NODE_ENV || 'development'
});