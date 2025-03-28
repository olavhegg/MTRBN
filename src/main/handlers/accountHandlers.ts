import { ipcMain } from 'electron';
import GraphService from '../services/graphService';
import { logger } from '../utils/logger';

export function setupAccountHandlers() {
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
            const existingAccount = await graphService.checkUser(upn);
            
            if (!existingAccount) {
                return {
                    success: false,
                    error: `Resource account ${upn} not found`
                };
            }
            
            // Update the display name
            await graphService.updateUserDisplayName(upn, displayName);
            
            return {
                success: true,
                message: `Display name updated to: ${displayName}`
            };
        } catch (error) {
            logger.error('Error updating resource account:', error);
            return {
                success: false,
                error: `Failed to update resource account: ${(error as Error).message || String(error)}`
            };
        }
    });

    // Handler for verifying account password
    ipcMain.handle('verify-account-password', async (_, upn) => {
        try {
            logger.info(`Verifying password for resource account: ${upn}`);
            const graphService = GraphService.getInstance();
            
            // Check if the account exists
            const existingAccount = await graphService.checkUser(upn);
            
            if (!existingAccount) {
                return {
                    success: false,
                    error: `Resource account ${upn} not found`
                };
            }
            
            // Check the password (assuming you have a method for this)
            const passwordStatus = await graphService.verifyUserPassword(upn);
            
            return {
                success: true,
                isValid: passwordStatus.isValid,
                message: passwordStatus.message
            };
        } catch (error) {
            logger.error('Error verifying account password:', error);
            return {
                success: false,
                error: `Failed to verify account password: ${(error as Error).message || String(error)}`
            };
        }
    });

    // Handler for resetting account password
    ipcMain.handle('reset-account-password', async (_, upn) => {
        try {
            logger.info(`Resetting password for resource account: ${upn}`);
            const graphService = GraphService.getInstance();
            
            // Check if the account exists
            const existingAccount = await graphService.checkUser(upn);
            
            if (!existingAccount) {
                return {
                    success: false,
                    error: `Resource account ${upn} not found`
                };
            }
            
            // Reset the password
            const result = await graphService.resetUserPassword(upn);
            
            return {
                success: true,
                message: `Password has been reset successfully`
            };
        } catch (error) {
            logger.error('Error resetting account password:', error);
            return {
                success: false,
                error: `Failed to reset account password: ${(error as Error).message || String(error)}`
            };
        }
    });

    // Handler for checking account unlock status
    ipcMain.handle('check-account-unlock', async (_, upn) => {
        try {
            logger.info(`Checking if account is unlocked: ${upn}`);
            const graphService = GraphService.getInstance();
            
            // Check if the account exists
            const existingAccount = await graphService.checkUser(upn);
            
            if (!existingAccount) {
                return {
                    success: false,
                    error: `Resource account ${upn} not found`
                };
            }
            
            // Check if the account is unlocked
            const unlockStatus = await graphService.checkAccountUnlocked(upn);
            
            return {
                success: true,
                isUnlocked: unlockStatus
            };
        } catch (error) {
            logger.error('Error checking account unlock status:', error);
            return {
                success: false,
                error: `Failed to check account unlock status: ${(error as Error).message || String(error)}`
            };
        }
    });
} 