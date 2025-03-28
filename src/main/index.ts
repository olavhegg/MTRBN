import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { setupAllHandlers } from './handlers';
import { logger } from './utils/logger';

// Load environment variables from .env file
dotenv.config();

// Disable certificate verification for corporate proxies
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost');
app.commandLine.appendSwitch('disable-features', 'IsolateOrigins,site-per-process');

// Configure session to handle certificate errors
app.whenReady().then(() => {
  // Setup certificate error handling
  session.defaultSession.webRequest.onErrorOccurred((details) => {
    if (details.error.includes('net::ERR_CERT_')) {
      logger.warn(`Certificate error for ${details.url}: ${details.error}`);
    }
  });

  // Setup all IPC handlers
  setupAllHandlers();
  
  // Add quit handler
  ipcMain.handle('quit-app', () => {
    app.quit();
  });
  
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// Create the main window
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    icon: path.join(__dirname, '..', 'logitech.ico')
  });

  // Load the renderer
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Set Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"]
      }
    });
  });

  // Always open DevTools for debugging
  mainWindow.webContents.openDevTools();

  return mainWindow;
}

// Quit when all windows are closed
app.on('window-all-closed', () => {
  logger.info('Application will quit');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('quit', () => {
  logger.info('Application has quit');
}); 