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
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const handlers_1 = require("./handlers");
const logger_1 = require("./utils/logger");
// Load environment variables from .env file
dotenv.config();
// Disable certificate verification for corporate proxies
electron_1.app.commandLine.appendSwitch('ignore-certificate-errors');
electron_1.app.commandLine.appendSwitch('allow-insecure-localhost');
electron_1.app.commandLine.appendSwitch('disable-features', 'IsolateOrigins,site-per-process');
// Configure session to handle certificate errors
electron_1.app.whenReady().then(() => {
    // Setup certificate error handling
    electron_1.session.defaultSession.webRequest.onErrorOccurred((details) => {
        if (details.error.includes('net::ERR_CERT_')) {
            logger_1.logger.warn(`Certificate error for ${details.url}: ${details.error}`);
        }
    });
    // Setup all IPC handlers
    (0, handlers_1.setupAllHandlers)();
    // Add quit handler
    electron_1.ipcMain.handle('quit-app', () => {
        electron_1.app.quit();
    });
    createWindow();
    electron_1.app.on('activate', function () {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
// Prevent multiple instances of the app
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
// Create the main window
function createWindow() {
    const mainWindow = new electron_1.BrowserWindow({
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
    electron_1.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
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
electron_1.app.on('window-all-closed', () => {
    logger_1.logger.info('Application will quit');
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// Handle app quit
electron_1.app.on('quit', () => {
    logger_1.logger.info('Application has quit');
});
//# sourceMappingURL=index.js.map