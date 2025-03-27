import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import 'dotenv/config';
import * as fs from 'fs';
import GraphService, { DeviceType } from './services/graphService';
import { logger } from './utils/logger';

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    // Enable live reload in development
    if (process.env.NODE_ENV === 'development') {
        try {
            require('electron-reloader')(module, {
                debug: false,
                watchRenderer: false,
            });
        } catch (_) {}
    }
}

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

// Handle second instance
app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

// IPC Handlers
ipcMain.handle('quit-app', () => {
    app.quit();
});

// Intune device handlers
ipcMain.handle('check-intune-device', async (_, serialNumber) => {
    console.log(`[IPC] Called check-intune-device with serial: ${serialNumber}`);
    try {
        logger.info(`Checking if device exists in Intune: ${serialNumber}`);
        const graphService = GraphService.getInstance();
        
        // Validate the device serial number format
        console.log('[IPC] Validating device serial format');
        const validationResult = graphService.validateDevice(serialNumber);
        console.log('[IPC] Validation result:', validationResult);
        if (!validationResult.isValid) {
            console.log('[IPC] Serial validation failed:', validationResult.validationMessage);
            return {
                success: false,
                error: validationResult.validationMessage
            };
        }
        
        // Check if device already exists in Intune
        console.log('[IPC] Checking if device exists in Intune');
        try {
            const existingDevice = await graphService.checkDeviceSerial(serialNumber);
            console.log('[IPC] Device check result:', existingDevice ? 'Found' : 'Not found');
            
            return {
                success: true,
                exists: !!existingDevice,
                device: existingDevice
            };
        } catch (graphError) {
            console.error('[IPC] Error from Graph API when checking device:', graphError);
            return {
                success: false,
                error: `Graph API error: ${(graphError as Error).message || String(graphError)}`
            };
        }
    } catch (error) {
        console.error('[IPC] Error checking Intune device:', error);
        logger.error('Error checking Intune device:', error);
        return {
            success: false,
            error: `Failed to check device: ${(error as Error).message || String(error)}`
        };
    }
});

ipcMain.handle('provision-intune', async (_, { serialNumber, description }) => {
    try {
        logger.info(`Provisioning device in Intune: ${serialNumber}`);
        const graphService = GraphService.getInstance();
        
        // Validate the device serial number format
        const validationResult = graphService.validateDevice(serialNumber);
        if (!validationResult.isValid) {
            return {
                success: false,
                error: validationResult.validationMessage
            };
        }
        
        // Check if device already exists
        let deviceInfo = await graphService.checkDeviceSerial(serialNumber);
        
        // If device doesn't exist, add it
        if (!deviceInfo) {
            await graphService.addDeviceSerial(serialNumber, description);
            deviceInfo = await graphService.checkDeviceSerial(serialNumber);
            logger.info(`Device provisioned successfully: ${serialNumber}`);
        } else {
            logger.info(`Device already exists in Intune: ${serialNumber}`);
        }
        
        return {
            success: true,
            device: deviceInfo
        };
    } catch (error) {
        logger.error('Error provisioning Intune device:', error);
        return {
            success: false,
            error: `Failed to provision device: ${(error as Error).message || String(error)}`
        };
    }
});

// Resource account handlers
ipcMain.handle('check-resource-account', async (_, upn) => {
    try {
        logger.info(`Checking if resource account exists: ${upn}`);
        const graphService = GraphService.getInstance();
        
        // Parse the UPN to extract username and domain parts
        const upnParts = upn.split('@');
        if (upnParts.length !== 2) {
            return {
                success: false,
                error: `Invalid UPN format: ${upn}`
            };
        }
        
        const [username, domain] = upnParts;
        
        // First try with the original domain
        try {
            const user = await graphService.checkUser(upn);
            if (user) {
                logger.info(`Resource account found with original domain: ${upn}`);
                return {
                    success: true,
                    exists: true,
                    account: user,
                    domain: 'original'
                };
            }
        } catch (error) {
            logger.info(`Resource account not found with original domain: ${upn}`);
        }
        
        // If not found, try with onmicrosoft.com domain
        // Extract the first part of the domain (e.g., "banenor" from "banenor.no")
        const domainParts = domain.split('.');
        const onmicrosoftDomain = `${domainParts[0]}.onmicrosoft.com`;
        const onmicrosoftUpn = `${username}@${onmicrosoftDomain}`;
        
        try {
            const user = await graphService.checkUser(onmicrosoftUpn);
            if (user) {
                logger.info(`Resource account found with onmicrosoft domain: ${onmicrosoftUpn}`);
                return {
                    success: true,
                    exists: true,
                    account: user,
                    domain: 'onmicrosoft'
                };
            }
        } catch (error) {
            logger.info(`Resource account not found with onmicrosoft domain: ${onmicrosoftUpn}`);
        }
        
        // If we get here, no account was found with either domain
        return {
            success: true,
            exists: false
        };
    } catch (error) {
        logger.error('Error checking resource account:', error);
        return {
            success: false,
            error: `Failed to check resource account: ${(error as Error).message || String(error)}`
        };
    }
});

ipcMain.handle('create-resource-account', async (_, { upn, displayName, password }) => {
    try {
        logger.info(`Creating resource account: ${upn}`);
        const graphService = GraphService.getInstance();
        
        // Check if the account already exists
        const existingAccount = await graphService.checkUser(upn);
        
        if (existingAccount) {
            return {
                success: false,
                error: `Resource account ${upn} already exists`
            };
        }
        
        // Create the account
        const newAccount = await graphService.createUser(displayName, upn);
        
        return {
            success: true,
            account: newAccount
        };
    } catch (error) {
        logger.error('Error creating resource account:', error);
        return {
            success: false,
            error: `Failed to create resource account: ${(error as Error).message || String(error)}`
        };
    }
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