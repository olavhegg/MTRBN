"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
require("dotenv/config");
const graphService_1 = __importDefault(require("./services/graphService"));
const logger_1 = require("./utils/logger");
// Prevent multiple instances
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    // Enable live reload in development
    if (process.env.NODE_ENV === 'development') {
        try {
            require('electron-reloader')(module, {
                debug: false,
                watchRenderer: false,
            });
        }
        catch (_) { }
    }
}
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
electron_1.app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized())
            mainWindow.restore();
        mainWindow.focus();
    }
});
// IPC Handlers
electron_1.ipcMain.handle('quit-app', () => {
    electron_1.app.quit();
});
// Intune device handlers
electron_1.ipcMain.handle('check-intune-device', async (_, serialNumber) => {
    console.log(`[IPC] Called check-intune-device with serial: ${serialNumber}`);
    try {
        logger_1.logger.info(`Checking if device exists in Intune: ${serialNumber}`);
        const graphService = graphService_1.default.getInstance();
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
        }
        catch (graphError) {
            console.error('[IPC] Error from Graph API when checking device:', graphError);
            return {
                success: false,
                error: `Graph API error: ${graphError.message || String(graphError)}`
            };
        }
    }
    catch (error) {
        console.error('[IPC] Error checking Intune device:', error);
        logger_1.logger.error('Error checking Intune device:', error);
        return {
            success: false,
            error: `Failed to check device: ${error.message || String(error)}`
        };
    }
});
electron_1.ipcMain.handle('provision-intune', async (_, { serialNumber, description }) => {
    try {
        logger_1.logger.info(`Provisioning device in Intune: ${serialNumber}`);
        const graphService = graphService_1.default.getInstance();
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
            logger_1.logger.info(`Device provisioned successfully: ${serialNumber}`);
        }
        else {
            logger_1.logger.info(`Device already exists in Intune: ${serialNumber}`);
        }
        return {
            success: true,
            device: deviceInfo
        };
    }
    catch (error) {
        logger_1.logger.error('Error provisioning Intune device:', error);
        return {
            success: false,
            error: `Failed to provision device: ${error.message || String(error)}`
        };
    }
});
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=index.js.map