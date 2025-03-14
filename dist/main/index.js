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
const microsoft_graph_client_1 = require("@microsoft/microsoft-graph-client");
require("dotenv/config");
const fs = __importStar(require("fs"));
let mainWindow = null;
// Enable hot reload in development mode
if (process.env.NODE_ENV !== 'production') {
    try {
        require('electron-reloader')(module, {
            debug: true,
            watchRenderer: true
        });
    }
    catch (_) {
        console.log('Error loading electron-reloader');
    }
}
// Initialize Graph Client
const graphClient = microsoft_graph_client_1.Client.init({
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
                    client_id: process.env.CLIENT_ID,
                    client_secret: process.env.CLIENT_SECRET,
                    scope: 'https://graph.microsoft.com/.default'
                })
            });
            const data = await response.json();
            callback(null, data.access_token);
        }
        catch (error) {
            callback(error, null);
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
        // Copy all necessary files
        const filesToCopy = ['index.html', 'styles.css', 'renderer.js'];
        filesToCopy.forEach(file => {
            const srcPath = path.join(srcDir, file);
            const destPath = path.join(destDir, file);
            if (fs.existsSync(srcPath)) {
                fs.copyFileSync(srcPath, file === 'renderer.js' ? destPath : path.join(destDir, file));
                console.log(`Copied ${file} successfully`);
            }
            else {
                console.warn(`Source file not found: ${srcPath}`);
            }
        });
    }
    catch (error) {
        console.error('Error copying renderer files:', error);
    }
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            devTools: process.env.NODE_ENV === 'development'
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
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// IPC Handlers
electron_1.ipcMain.handle('check-resource-account', async (_, upn) => {
    try {
        const response = await graphClient
            .api('/beta/users/' + upn)
            .get();
        return { exists: true, user: response };
    }
    catch (error) {
        return { exists: false, error };
    }
});
electron_1.ipcMain.handle('create-resource-account', async (_, accountDetails) => {
    try {
        const response = await graphClient
            .api('/beta/users')
            .post(accountDetails);
        return { success: true, user: response };
    }
    catch (error) {
        return { success: false, error };
    }
});
electron_1.ipcMain.handle('check-intune-device', async (_, serialNumber) => {
    try {
        const devices = await graphClient
            .api('/beta/deviceManagement/managedDevices')
            .filter(`serialNumber eq '${serialNumber}'`)
            .get();
        return { exists: devices.value.length > 0, devices: devices.value };
    }
    catch (error) {
        return { exists: false, error };
    }
});
electron_1.ipcMain.handle('check-tac-device', async (_, macAddress) => {
    // Note: This is a placeholder. You'll need to implement the actual TAC API call
    try {
        return { exists: false, message: 'TAC check not implemented' };
    }
    catch (error) {
        return { exists: false, error };
    }
});
//# sourceMappingURL=index.js.map