import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import TACService from './services/tacService';
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

app.whenReady().then(() => {
    createWindow();
    setupIPCHandlers();
});

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

function setupIPCHandlers() {
    const tacService = TACService.getInstance();

    ipcMain.handle('get-tac-devices', async () => {
        try {
            logger.info('Handling get-tac-devices request');
            const devices = await tacService.getProvisionedDevices();
            return { devices };
        } catch (error) {
            logger.error('Error handling get-tac-devices request:', error);
            throw error;
        }
    });

    ipcMain.handle('check-tac-device', async (_, macAddress: string) => {
        try {
            logger.info(`Handling check-tac-device request for ${macAddress}`);
            const exists = await tacService.checkDeviceExists(macAddress);
            return { exists };
        } catch (error) {
            logger.error(`Error handling check-tac-device request for ${macAddress}:`, error);
            throw error;
        }
    });
    
    ipcMain.handle('quit-app', () => {
        logger.info('Quitting application');
        app.quit();
    });
} 