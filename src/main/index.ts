import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import 'dotenv/config';
import * as fs from 'fs';
import GraphService, { DeviceType } from './services/graphService';
import { logger } from './utils/logger';

// Disable certificate verification for corporate proxies
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost');

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

// Handler for updating resource account display name
ipcMain.handle('update-resource-account', async (_, { upn, displayName }) => {
    try {
        logger.info(`Updating resource account display name: ${upn} to "${displayName}"`);
        const graphService = GraphService.getInstance();
        
        // Check if the account exists
        let existingAccount = null;
        try {
            existingAccount = await graphService.checkUser(upn);
        } catch (error) {
            logger.info(`Resource account not found: ${upn}`);
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
    } catch (error) {
        logger.error('Error updating resource account:', error);
        return {
            success: false,
            error: `Failed to update resource account: ${(error as Error).message || String(error)}`
        };
    }
});

// Handler for verifying resource account password
ipcMain.handle('verify-account-password', async (_, upn) => {
    try {
        logger.info(`Verifying password for resource account: ${upn}`);
        const graphService = GraphService.getInstance();
        
        // First check if the account exists
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        } catch (error) {
            logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${(error as Error).message}`
            };
        }
        
        // Now verify the password
        const verificationResult = await graphService.verifyUserPassword(upn);
        
        return {
            success: true,
            isValid: verificationResult.isValid,
            message: verificationResult.message
        };
    } catch (error) {
        logger.error('Error verifying resource account password:', error);
        return {
            success: false,
            error: `Failed to verify password: ${(error as Error).message}`
        };
    }
});

// Handler for resetting resource account password
ipcMain.handle('reset-account-password', async (_, upn) => {
    try {
        logger.info(`Resetting password for resource account: ${upn}`);
        const graphService = GraphService.getInstance();
        
        // First check if the account exists
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        } catch (error) {
            logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${(error as Error).message}`
            };
        }
        
        await graphService.resetUserPassword(upn);
        
        return {
            success: true,
            message: "Password reset successful"
        };
    } catch (error) {
        logger.error('Error resetting resource account password:', error);
        return {
            success: false,
            error: `Failed to reset password: ${(error as Error).message}`
        };
    }
});

// Handler for checking if account is unlocked
ipcMain.handle('check-account-unlock', async (_, upn) => {
    try {
        logger.info(`Checking if account is unlocked: ${upn}`);
        const graphService = GraphService.getInstance();
        
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        } catch (error) {
            logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${(error as Error).message}`
            };
        }
        
        const result = await graphService.checkAccountUnlocked(upn);
        
        return {
            success: true,
            isUnlocked: result.isUnlocked,
            message: result.message
        };
    } catch (error) {
        logger.error('Error checking account unlock status:', error);
        return {
            success: false,
            error: `Failed to check account status: ${(error as Error).message}`
        };
    }
});

// Handler for checking group membership
ipcMain.handle('check-group-membership', async (_, upn) => {
    try {
        logger.info(`Checking group membership for: ${upn}`);
        const graphService = GraphService.getInstance();
        
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        } catch (error) {
            logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${(error as Error).message}`
            };
        }
        
        const result = await graphService.checkMtrGroupMembership(upn);
        
        return {
            success: true,
            isMember: result.isMember,
            message: result.message
        };
    } catch (error) {
        logger.error('Error checking group membership:', error);
        return {
            success: false,
            error: `Failed to check group membership: ${(error as Error).message}`
        };
    }
});

// Handler for checking Room group membership
ipcMain.handle('check-room-membership', async (_, upn) => {
    try {
        logger.info(`Checking Room group membership for: ${upn}`);
        const graphService = GraphService.getInstance();
        
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        } catch (error) {
            logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${(error as Error).message}`
            };
        }
        
        const result = await graphService.checkRoomGroupMembership(upn);
        
        return {
            success: true,
            isMember: result.isMember,
            message: result.message
        };
    } catch (error) {
        logger.error('Error checking Room group membership:', error);
        return {
            success: false,
            error: `Failed to check Room group membership: ${(error as Error).message}`
        };
    }
});

// Handler for adding user to MTR group
ipcMain.handle('add-to-mtr-group', async (_, upn) => {
    try {
        logger.info(`Adding user to MTR group: ${upn}`);
        const graphService = GraphService.getInstance();
        
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        } catch (error) {
            logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${(error as Error).message}`
            };
        }
        
        const result = await graphService.addUserToMtrGroup(upn);
        
        return {
            success: result.success,
            message: result.message
        };
    } catch (error) {
        logger.error('Error adding user to MTR group:', error);
        return {
            success: false,
            error: `Failed to add to MTR group: ${(error as Error).message}`
        };
    }
});

// Handler for removing user from MTR group
ipcMain.handle('remove-from-mtr-group', async (_, upn) => {
    try {
        logger.info(`Removing user from MTR group: ${upn}`);
        const graphService = GraphService.getInstance();
        
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        } catch (error) {
            logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${(error as Error).message}`
            };
        }
        
        const result = await graphService.removeUserFromMtrGroup(upn);
        
        return {
            success: result.success,
            message: result.message
        };
    } catch (error) {
        logger.error('Error removing user from MTR group:', error);
        return {
            success: false,
            error: `Failed to remove from MTR group: ${(error as Error).message}`
        };
    }
});

// Handler for adding user to Room group
ipcMain.handle('add-to-room-group', async (_, upn) => {
    try {
        logger.info(`Adding user to Room group: ${upn}`);
        const graphService = GraphService.getInstance();
        
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        } catch (error) {
            logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${(error as Error).message}`
            };
        }
        
        const result = await graphService.addUserToRoomGroup(upn);
        
        return {
            success: result.success,
            message: result.message
        };
    } catch (error) {
        logger.error('Error adding user to Room group:', error);
        return {
            success: false,
            error: `Failed to add to Room group: ${(error as Error).message}`
        };
    }
});

// Handler for removing user from Room group
ipcMain.handle('remove-from-room-group', async (_, upn) => {
    try {
        logger.info(`Removing user from Room group: ${upn}`);
        const graphService = GraphService.getInstance();
        
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        } catch (error) {
            logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${(error as Error).message}`
            };
        }
        
        const result = await graphService.removeUserFromRoomGroup(upn);
        
        return {
            success: result.success,
            message: result.message
        };
    } catch (error) {
        logger.error('Error removing user from Room group:', error);
        return {
            success: false,
            error: `Failed to remove from Room group: ${(error as Error).message}`
        };
    }
});

// Handler for checking Pro license group membership
ipcMain.handle('check-pro-membership', async (_, upn) => {
    try {
        logger.info(`Checking Pro license group membership for: ${upn}`);
        const graphService = GraphService.getInstance();
        
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        } catch (error) {
            logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${(error as Error).message}`
            };
        }
        
        const result = await graphService.checkProGroupMembership(upn);
        
        return {
            success: true,
            isMember: result.isMember,
            message: result.message
        };
    } catch (error) {
        logger.error('Error checking Pro license group membership:', error);
        return {
            success: false,
            error: `Failed to check Pro license group membership: ${(error as Error).message}`
        };
    }
});

// Handler for adding user to Pro license group
ipcMain.handle('add-to-pro-group', async (_, upn) => {
    try {
        logger.info(`Adding user to Pro license group: ${upn}`);
        const graphService = GraphService.getInstance();
        
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        } catch (error) {
            logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${(error as Error).message}`
            };
        }
        
        const result = await graphService.addUserToProGroup(upn);
        
        return {
            success: result.success,
            message: result.message
        };
    } catch (error) {
        logger.error('Error adding user to Pro license group:', error);
        return {
            success: false,
            error: `Failed to add to Pro license group: ${(error as Error).message}`
        };
    }
});

// Handler for removing user from Pro license group
ipcMain.handle('remove-from-pro-group', async (_, upn) => {
    try {
        logger.info(`Removing user from Pro license group: ${upn}`);
        const graphService = GraphService.getInstance();
        
        // Check if the account exists first
        try {
            const account = await graphService.checkUser(upn);
            if (!account) {
                return {
                    success: false,
                    error: `Resource account ${upn} does not exist`
                };
            }
        } catch (error) {
            logger.error('Error checking account existence:', error);
            return {
                success: false,
                error: `Account check failed: ${(error as Error).message}`
            };
        }
        
        const result = await graphService.removeUserFromProGroup(upn);
        
        return {
            success: result.success,
            message: result.message
        };
    } catch (error) {
        logger.error('Error removing user from Pro license group:', error);
        return {
            success: false,
            error: `Failed to remove from Pro license group: ${(error as Error).message}`
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