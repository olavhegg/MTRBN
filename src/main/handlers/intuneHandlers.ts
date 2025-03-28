import { ipcMain } from 'electron';
import GraphService from '../services/graphService';
import { logger } from '../utils/logger';

export function setupIntuneHandlers() {
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
} 