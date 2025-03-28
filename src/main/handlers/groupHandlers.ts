import { ipcMain } from 'electron';
import GraphService from '../services/graphService';
import { logger } from '../utils/logger';

export function setupGroupHandlers() {
    // Handler for checking group membership
    ipcMain.handle('check-group-membership', async (_, upn) => {
        try {
            logger.info(`Checking group membership for: ${upn}`);
            const graphService = GraphService.getInstance();
            
            // Check if the account exists
            const existingAccount = await graphService.checkUser(upn);
            
            if (!existingAccount) {
                return {
                    success: false,
                    error: `Resource account ${upn} not found`
                };
            }
            
            // Check group membership
            const isMember = await graphService.checkGroupMembership(upn, 'mtr-group-id');
            
            return {
                success: true,
                isMember
            };
        } catch (error) {
            logger.error('Error checking group membership:', error);
            return {
                success: false,
                error: `Failed to check group membership: ${(error as Error).message || String(error)}`
            };
        }
    });

    // Handler for checking Room group membership
    ipcMain.handle('check-room-membership', async (_, upn) => {
        try {
            logger.info(`Checking Room group membership for: ${upn}`);
            const graphService = GraphService.getInstance();
            
            // Check if the account exists
            const existingAccount = await graphService.checkUser(upn);
            
            if (!existingAccount) {
                return {
                    success: false,
                    error: `Resource account ${upn} not found`
                };
            }
            
            // Check Room group membership
            const isMember = await graphService.checkGroupMembership(upn, 'room-group-id');
            
            return {
                success: true,
                isMember
            };
        } catch (error) {
            logger.error('Error checking Room group membership:', error);
            return {
                success: false,
                error: `Failed to check Room group membership: ${(error as Error).message || String(error)}`
            };
        }
    });

    // Handler for checking Pro license group membership
    ipcMain.handle('check-pro-membership', async (_, upn) => {
        try {
            logger.info(`Checking Pro license group membership for: ${upn}`);
            const graphService = GraphService.getInstance();
            
            // Check if the account exists
            const existingAccount = await graphService.checkUser(upn);
            
            if (!existingAccount) {
                return {
                    success: false,
                    error: `Resource account ${upn} not found`
                };
            }
            
            // Check Pro license group membership
            const isMember = await graphService.checkGroupMembership(upn, 'pro-group-id');
            
            return {
                success: true,
                isMember
            };
        } catch (error) {
            logger.error('Error checking Pro license group membership:', error);
            return {
                success: false,
                error: `Failed to check Pro license group membership: ${(error as Error).message || String(error)}`
            };
        }
    });

    // Handler for adding user to MTR group
    ipcMain.handle('add-to-mtr-group', async (_, upn) => {
        try {
            logger.info(`Adding user to MTR group: ${upn}`);
            const graphService = GraphService.getInstance();
            
            // Check if the account exists
            const existingAccount = await graphService.checkUser(upn);
            
            if (!existingAccount) {
                return {
                    success: false,
                    error: `Resource account ${upn} not found`
                };
            }
            
            // Check if already a member
            const isMember = await graphService.checkGroupMembership(upn, 'mtr-group-id');
            
            if (isMember) {
                return {
                    success: true,
                    message: `User ${upn} is already a member of the MTR group`
                };
            }
            
            // Add to MTR group
            await graphService.addUserToMtrGroup(upn);
            
            return {
                success: true,
                message: `User ${upn} added to MTR group successfully`
            };
        } catch (error) {
            logger.error('Error adding user to MTR group:', error);
            return {
                success: false,
                error: `Failed to add user to MTR group: ${(error as Error).message || String(error)}`
            };
        }
    });

    // Handler for removing user from MTR group
    ipcMain.handle('remove-from-mtr-group', async (_, upn) => {
        try {
            logger.info(`Removing user from MTR group: ${upn}`);
            const graphService = GraphService.getInstance();
            
            // Check if the account exists
            const existingAccount = await graphService.checkUser(upn);
            
            if (!existingAccount) {
                return {
                    success: false,
                    error: `Resource account ${upn} not found`
                };
            }
            
            // Check if a member
            const isMember = await graphService.checkGroupMembership(upn, 'mtr-group-id');
            
            if (!isMember) {
                return {
                    success: true,
                    message: `User ${upn} is not a member of the MTR group`
                };
            }
            
            // Remove from MTR group
            await graphService.removeUserFromMtrGroup(upn);
            
            return {
                success: true,
                message: `User ${upn} removed from MTR group successfully`
            };
        } catch (error) {
            logger.error('Error removing user from MTR group:', error);
            return {
                success: false,
                error: `Failed to remove user from MTR group: ${(error as Error).message || String(error)}`
            };
        }
    });

    // Handler for adding user to Room group
    ipcMain.handle('add-to-room-group', async (_, upn) => {
        try {
            logger.info(`Adding user to Room group: ${upn}`);
            const graphService = GraphService.getInstance();
            
            // Check if the account exists
            const existingAccount = await graphService.checkUser(upn);
            
            if (!existingAccount) {
                return {
                    success: false,
                    error: `Resource account ${upn} not found`
                };
            }
            
            // Check if already a member
            const isMember = await graphService.checkGroupMembership(upn, 'room-group-id');
            
            if (isMember) {
                return {
                    success: true,
                    message: `User ${upn} is already a member of the Room group`
                };
            }
            
            // Add to Room group
            await graphService.addUserToRoomGroup(upn);
            
            return {
                success: true,
                message: `User ${upn} added to Room group successfully`
            };
        } catch (error) {
            logger.error('Error adding user to Room group:', error);
            return {
                success: false,
                error: `Failed to add user to Room group: ${(error as Error).message || String(error)}`
            };
        }
    });

    // Handler for removing user from Room group
    ipcMain.handle('remove-from-room-group', async (_, upn) => {
        try {
            logger.info(`Removing user from Room group: ${upn}`);
            const graphService = GraphService.getInstance();
            
            // Check if the account exists
            const existingAccount = await graphService.checkUser(upn);
            
            if (!existingAccount) {
                return {
                    success: false,
                    error: `Resource account ${upn} not found`
                };
            }
            
            // Check if a member
            const isMember = await graphService.checkGroupMembership(upn, 'room-group-id');
            
            if (!isMember) {
                return {
                    success: true,
                    message: `User ${upn} is not a member of the Room group`
                };
            }
            
            // Remove from Room group
            await graphService.removeUserFromRoomGroup(upn);
            
            return {
                success: true,
                message: `User ${upn} removed from Room group successfully`
            };
        } catch (error) {
            logger.error('Error removing user from Room group:', error);
            return {
                success: false,
                error: `Failed to remove user from Room group: ${(error as Error).message || String(error)}`
            };
        }
    });

    // Handler for adding user to Pro license group
    ipcMain.handle('add-to-pro-group', async (_, upn) => {
        try {
            logger.info(`Adding user to Pro license group: ${upn}`);
            const graphService = GraphService.getInstance();
            
            // Check if the account exists
            const existingAccount = await graphService.checkUser(upn);
            
            if (!existingAccount) {
                return {
                    success: false,
                    error: `Resource account ${upn} not found`
                };
            }
            
            // Check if already a member
            const isMember = await graphService.checkGroupMembership(upn, 'pro-group-id');
            
            if (isMember) {
                return {
                    success: true,
                    message: `User ${upn} is already a member of the Pro license group`
                };
            }
            
            // Add to Pro license group
            await graphService.addUserToProGroup(upn);
            
            return {
                success: true,
                message: `User ${upn} added to Pro license group successfully`
            };
        } catch (error) {
            logger.error('Error adding user to Pro license group:', error);
            return {
                success: false,
                error: `Failed to add user to Pro license group: ${(error as Error).message || String(error)}`
            };
        }
    });

    // Handler for removing user from Pro license group
    ipcMain.handle('remove-from-pro-group', async (_, upn) => {
        try {
            logger.info(`Removing user from Pro license group: ${upn}`);
            const graphService = GraphService.getInstance();
            
            // Check if the account exists
            const existingAccount = await graphService.checkUser(upn);
            
            if (!existingAccount) {
                return {
                    success: false,
                    error: `Resource account ${upn} not found`
                };
            }
            
            // Check if a member
            const isMember = await graphService.checkGroupMembership(upn, 'pro-group-id');
            
            if (!isMember) {
                return {
                    success: true,
                    message: `User ${upn} is not a member of the Pro license group`
                };
            }
            
            // Remove from Pro license group
            await graphService.removeUserFromProGroup(upn);
            
            return {
                success: true,
                message: `User ${upn} removed from Pro license group successfully`
            };
        } catch (error) {
            logger.error('Error removing user from Pro license group:', error);
            return {
                success: false,
                error: `Failed to remove user from Pro license group: ${(error as Error).message || String(error)}`
            };
        }
    });

    // Handler for diagnostic information
    ipcMain.handle('group-diagnostic', async (_) => {
        try {
            const graphService = GraphService.getInstance();
            const diagnosticInfo = await graphService.getDiagnosticInfo();
            
            return {
                success: true,
                diagnosticInfo
            };
        } catch (error) {
            logger.error('Error getting group diagnostic info:', error);
            return {
                success: false,
                error: `Failed to get diagnostic info: ${(error as Error).message || String(error)}`
            };
        }
    });

    // Handler for license information
    ipcMain.handle('get-license-info', async () => {
        try {
            logger.info('Getting license information');
            const graphService = GraphService.getInstance();
            
            const result = await graphService.getLicenseInfo();
            
            return result;
        } catch (error) {
            logger.error('Error getting license information:', error);
            return {
                success: false,
                error: `Failed to get license information: ${(error as Error).message || String(error)}`
            };
        }
    });
} 