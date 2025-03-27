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
// Resource account handlers
electron_1.ipcMain.handle('check-resource-account', async (_, upn) => {
    try {
        logger_1.logger.info(`Checking if resource account exists: ${upn}`);
        const graphService = graphService_1.default.getInstance();
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
                logger_1.logger.info(`Resource account found with original domain: ${upn}`);
                return {
                    success: true,
                    exists: true,
                    account: user,
                    domain: 'original'
                };
            }
        }
        catch (error) {
            logger_1.logger.info(`Resource account not found with original domain: ${upn}`);
        }
        // If not found, try with onmicrosoft.com domain
        // Extract the first part of the domain (e.g., "banenor" from "banenor.no")
        const domainParts = domain.split('.');
        const onmicrosoftDomain = `${domainParts[0]}.onmicrosoft.com`;
        const onmicrosoftUpn = `${username}@${onmicrosoftDomain}`;
        try {
            const user = await graphService.checkUser(onmicrosoftUpn);
            if (user) {
                logger_1.logger.info(`Resource account found with onmicrosoft domain: ${onmicrosoftUpn}`);
                return {
                    success: true,
                    exists: true,
                    account: user,
                    domain: 'onmicrosoft'
                };
            }
        }
        catch (error) {
            logger_1.logger.info(`Resource account not found with onmicrosoft domain: ${onmicrosoftUpn}`);
        }
        // If we get here, no account was found with either domain
        return {
            success: true,
            exists: false
        };
    }
    catch (error) {
        logger_1.logger.error('Error checking resource account:', error);
        return {
            success: false,
            error: `Failed to check resource account: ${error.message || String(error)}`
        };
    }
});
electron_1.ipcMain.handle('create-resource-account', async (_, { upn, displayName, password }) => {
    try {
        logger_1.logger.info(`Creating resource account: ${upn}`);
        const graphService = graphService_1.default.getInstance();
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
    }
    catch (error) {
        logger_1.logger.error('Error creating resource account:', error);
        return {
            success: false,
            error: `Failed to create resource account: ${error.message || String(error)}`
        };
    }
});
// Handler for updating resource account display name
electron_1.ipcMain.handle('update-resource-account', async (_, { upn, displayName }) => {
    try {
        logger_1.logger.info(`Updating resource account display name: ${upn} to "${displayName}"`);
        const graphService = graphService_1.default.getInstance();
        // Check if the account exists
        let existingAccount = null;
        try {
            existingAccount = await graphService.checkUser(upn);
        }
        catch (error) {
            logger_1.logger.info(`Resource account not found: ${upn}`);
            return {
                success: false,
                error: `Resource account ${upn} does not exist`
            };
        }
        if (!existingAccount) {
            return {
                success: false,
                error: `Resource account ${upn} does not exist`
            };
        }
        // Update the display name
        await graphService.updateUserDisplayName(upn, displayName);
        // Get the updated account details
        const updatedAccount = await graphService.checkUser(upn);
        return {
            success: true,
            account: updatedAccount
        };
    }
    catch (error) {
        logger_1.logger.error('Error updating resource account:', error);
        return {
            success: false,
            error: `Failed to update resource account: ${error.message || String(error)}`
        };
    }
});
// Handler for verifying resource account password
electron_1.ipcMain.handle('verify-account-password', async (_, upn) => {
    try {
        logger_1.logger.info(`Verifying password for resource account: ${upn}`);
        const graphService = graphService_1.default.getInstance();
        // First check if the account exists
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${error.message}`
            };
        }
        // Now verify the password
        const verificationResult = await graphService.verifyUserPassword(upn);
        return {
            success: true,
            isValid: verificationResult.isValid,
            message: verificationResult.message
        };
    }
    catch (error) {
        logger_1.logger.error('Error verifying resource account password:', error);
        return {
            success: false,
            error: `Failed to verify password: ${error.message}`
        };
    }
});
// Handler for resetting resource account password
electron_1.ipcMain.handle('reset-account-password', async (_, upn) => {
    try {
        logger_1.logger.info(`Resetting password for resource account: ${upn}`);
        const graphService = graphService_1.default.getInstance();
        // First check if the account exists
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${error.message}`
            };
        }
        await graphService.resetUserPassword(upn);
        return {
            success: true,
            message: "Password reset successful"
        };
    }
    catch (error) {
        logger_1.logger.error('Error resetting resource account password:', error);
        return {
            success: false,
            error: `Failed to reset password: ${error.message}`
        };
    }
});
// Handler for checking if account is unlocked
electron_1.ipcMain.handle('check-account-unlock', async (_, upn) => {
    try {
        logger_1.logger.info(`Checking if account is unlocked: ${upn}`);
        const graphService = graphService_1.default.getInstance();
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${error.message}`
            };
        }
        const result = await graphService.checkAccountUnlocked(upn);
        return {
            success: true,
            isUnlocked: result.isUnlocked,
            message: result.message
        };
    }
    catch (error) {
        logger_1.logger.error('Error checking account unlock status:', error);
        return {
            success: false,
            error: `Failed to check account status: ${error.message}`
        };
    }
});
// Handler for checking group membership
electron_1.ipcMain.handle('check-group-membership', async (_, upn) => {
    try {
        logger_1.logger.info(`Checking group membership for: ${upn}`);
        const graphService = graphService_1.default.getInstance();
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${error.message}`
            };
        }
        const result = await graphService.checkMtrGroupMembership(upn);
        return {
            success: true,
            isMember: result.isMember,
            message: result.message
        };
    }
    catch (error) {
        logger_1.logger.error('Error checking group membership:', error);
        return {
            success: false,
            error: `Failed to check group membership: ${error.message}`
        };
    }
});
// Handler for checking Room group membership
electron_1.ipcMain.handle('check-room-membership', async (_, upn) => {
    try {
        logger_1.logger.info(`Checking Room group membership for: ${upn}`);
        const graphService = graphService_1.default.getInstance();
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${error.message}`
            };
        }
        const result = await graphService.checkRoomGroupMembership(upn);
        return {
            success: true,
            isMember: result.isMember,
            message: result.message
        };
    }
    catch (error) {
        logger_1.logger.error('Error checking Room group membership:', error);
        return {
            success: false,
            error: `Failed to check Room group membership: ${error.message}`
        };
    }
});
// Handler for adding user to MTR group
electron_1.ipcMain.handle('add-to-mtr-group', async (_, upn) => {
    try {
        logger_1.logger.info(`Adding user to MTR group: ${upn}`);
        const graphService = graphService_1.default.getInstance();
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${error.message}`
            };
        }
        const result = await graphService.addUserToMtrGroup(upn);
        return {
            success: result.success,
            message: result.message
        };
    }
    catch (error) {
        logger_1.logger.error('Error adding user to MTR group:', error);
        return {
            success: false,
            error: `Failed to add to MTR group: ${error.message}`
        };
    }
});
// Handler for removing user from MTR group
electron_1.ipcMain.handle('remove-from-mtr-group', async (_, upn) => {
    try {
        logger_1.logger.info(`Removing user from MTR group: ${upn}`);
        const graphService = graphService_1.default.getInstance();
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${error.message}`
            };
        }
        const result = await graphService.removeUserFromMtrGroup(upn);
        return {
            success: result.success,
            message: result.message
        };
    }
    catch (error) {
        logger_1.logger.error('Error removing user from MTR group:', error);
        return {
            success: false,
            error: `Failed to remove from MTR group: ${error.message}`
        };
    }
});
// Handler for adding user to Room group
electron_1.ipcMain.handle('add-to-room-group', async (_, upn) => {
    try {
        logger_1.logger.info(`Adding user to Room group: ${upn}`);
        const graphService = graphService_1.default.getInstance();
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${error.message}`
            };
        }
        const result = await graphService.addUserToRoomGroup(upn);
        return {
            success: result.success,
            message: result.message
        };
    }
    catch (error) {
        logger_1.logger.error('Error adding user to Room group:', error);
        return {
            success: false,
            error: `Failed to add to Room group: ${error.message}`
        };
    }
});
// Handler for removing user from Room group
electron_1.ipcMain.handle('remove-from-room-group', async (_, upn) => {
    try {
        logger_1.logger.info(`Removing user from Room group: ${upn}`);
        const graphService = graphService_1.default.getInstance();
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${error.message}`
            };
        }
        const result = await graphService.removeUserFromRoomGroup(upn);
        return {
            success: result.success,
            message: result.message
        };
    }
    catch (error) {
        logger_1.logger.error('Error removing user from Room group:', error);
        return {
            success: false,
            error: `Failed to remove from Room group: ${error.message}`
        };
    }
});
// Handler for checking Pro license group membership
electron_1.ipcMain.handle('check-pro-membership', async (_, upn) => {
    try {
        logger_1.logger.info(`Checking Pro license group membership for: ${upn}`);
        const graphService = graphService_1.default.getInstance();
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${error.message}`
            };
        }
        const result = await graphService.checkProGroupMembership(upn);
        return {
            success: true,
            isMember: result.isMember,
            message: result.message
        };
    }
    catch (error) {
        logger_1.logger.error('Error checking Pro license group membership:', error);
        return {
            success: false,
            error: `Failed to check Pro license group membership: ${error.message}`
        };
    }
});
// Handler for adding user to Pro license group
electron_1.ipcMain.handle('add-to-pro-group', async (_, upn) => {
    try {
        logger_1.logger.info(`Adding user to Pro license group: ${upn}`);
        const graphService = graphService_1.default.getInstance();
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${error.message}`
            };
        }
        const result = await graphService.addUserToProGroup(upn);
        return {
            success: result.success,
            message: result.message
        };
    }
    catch (error) {
        logger_1.logger.error('Error adding user to Pro license group:', error);
        return {
            success: false,
            error: `Failed to add to Pro license group: ${error.message}`
        };
    }
});
// Handler for removing user from Pro license group
electron_1.ipcMain.handle('remove-from-pro-group', async (_, upn) => {
    try {
        logger_1.logger.info(`Removing user from Pro license group: ${upn}`);
        const graphService = graphService_1.default.getInstance();
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${error.message}`
            };
        }
        const result = await graphService.removeUserFromProGroup(upn);
        return {
            success: result.success,
            message: result.message
        };
    }
    catch (error) {
        logger_1.logger.error('Error removing user from Pro license group:', error);
        return {
            success: false,
            error: `Failed to remove from Pro license group: ${error.message}`
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