import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { Client } from '@microsoft/microsoft-graph-client';
import 'dotenv/config';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

// Enable hot reload in development mode
if (process.env.NODE_ENV !== 'production') {
    try {
        require('electron-reloader')(module, {
            debug: true,
            watchRenderer: true
        });
    } catch (_) { console.log('Error loading electron-reloader'); }
}

// Initialize Graph Client
const graphClient = Client.init({
  authProvider: async (callback) => {
    try {
      // Using client credentials flow
      const response = await fetch('https://login.microsoftonline.com/' + process.env.TENANT_ID + '/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.CLIENT_ID!,
          client_secret: process.env.CLIENT_SECRET!,
          scope: 'https://graph.microsoft.com/.default'
        })
      });

      const data = await response.json();
      callback(null, data.access_token);
    } catch (error) {
      callback(error as Error, null);
    }
  }
});

function copyRendererFiles() {
    const srcDir = path.join(__dirname, '../../src/renderer');
    const destDir = path.join(__dirname, '../renderer');
    
    console.log('Copying renderer files:');
    console.log('From:', srcDir);
    console.log('To:', destDir);
    
    try {
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        
        // Copy only HTML and CSS files, JavaScript will be handled by webpack
        const filesToCopy = ['index.html', 'styles.css'];
        filesToCopy.forEach(file => {
            const srcPath = path.join(srcDir, file);
            const destPath = path.join(destDir, file);
            
            if (fs.existsSync(srcPath)) {
                fs.copyFileSync(srcPath, destPath);
                console.log(`Copied ${file} successfully`);
            } else {
                console.warn(`Source file not found: ${srcPath}`);
            }
        });
    } catch (error) {
        console.error('Error copying renderer files:', error);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js')
        }
    });

    copyRendererFiles();

    const htmlPath = path.join(__dirname, '../renderer/index.html');
    console.log('Loading HTML from:', htmlPath);
    
    mainWindow.loadFile(htmlPath);

    // Open DevTools in development mode
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
        console.log('DevTools opened in development mode');
    }

    // Log any loading errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });

    // Log when the window is ready
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Window loaded successfully');
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('check-resource-account', async (_, upn: string) => {
  try {
    const response = await graphClient
      .api('/beta/users/' + upn)
      .get();
    return { exists: true, user: response };
  } catch (error) {
    return { exists: false, error };
  }
});

ipcMain.handle('create-resource-account', async (_, accountDetails: any) => {
  try {
    const response = await graphClient
      .api('/beta/users')
      .post(accountDetails);
    return { success: true, user: response };
  } catch (error) {
    return { success: false, error };
  }
});

ipcMain.handle('check-intune-device', async (_, serialNumber: string) => {
  try {
    const devices = await graphClient
      .api('/beta/deviceManagement/managedDevices')
      .filter(`serialNumber eq '${serialNumber}'`)
      .get();
    return { exists: devices.value.length > 0, devices: devices.value };
  } catch (error) {
    return { exists: false, error };
  }
});

ipcMain.handle('check-tac-device', async (_, macAddress: string) => {
  // Note: This is a placeholder. You'll need to implement the actual TAC API call
  try {
    return { exists: false, message: 'TAC check not implemented' };
  } catch (error) {
    return { exists: false, error };
  }
}); 