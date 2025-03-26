import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import 'dotenv/config';
import * as fs from 'fs';
import GraphService, { DeviceType } from './services/graphService';
import { logger } from './utils/logger';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, '../preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.webContents.openDevTools();

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

// IPC Handlers
ipcMain.handle('quit-app', () => {
    app.quit();
});

app.whenReady().then(() => {
    createWindow();

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