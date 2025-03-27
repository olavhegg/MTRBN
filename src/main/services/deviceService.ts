import { GraphBaseService } from './graphBaseService';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeviceService');

interface DeviceIdentity {
    importedDeviceIdentifier: string;
    description: string;
    enrollmentState: string;
    importedDeviceIdentityType: string;
    platform: string;
    lastContactedDateTime?: string;
}

export enum DeviceType {
    LogitechDevice = 'Logitech Device'
}

export interface DeviceInfo {
    type: DeviceType;
    isValid: boolean;
    validationMessage: string;
}

export class DeviceService extends GraphBaseService {
    private static instance: DeviceService;

    private constructor() {
        super();
    }

    public static getInstance(): DeviceService {
        if (!DeviceService.instance) {
            DeviceService.instance = new DeviceService();
        }
        return DeviceService.instance;
    }

    public async checkDeviceSerial(serialNumber: string): Promise<DeviceIdentity | null> {
        try {
            console.log(`[DeviceService] Checking device serial: ${serialNumber}`);
            const client = await this.getClient();
            console.log(`[DeviceService] Got client, making API call...`);
            
            // Get all devices and filter in JavaScript - this approach works reliably
            const endpoint = 'https://graph.microsoft.com/beta/deviceManagement/importedDeviceIdentities';
            console.log(`[DeviceService] Calling API endpoint to get all devices: ${endpoint}`);
            
            try {
                const result = await client.api(endpoint).get();
                
                console.log(`[DeviceService] API call successful, found ${result.value ? result.value.length : 0} devices`);
                
                // Find the device with the matching serial number
                if (result.value && result.value.length > 0) {
                    const device = result.value.find((d: DeviceIdentity) => 
                        d.importedDeviceIdentifier === serialNumber
                    );
                    
                    if (device) {
                        console.log(`[DeviceService] Found device with serial ${serialNumber}:`, device);
                        return device;
                    } else {
                        console.log(`[DeviceService] No device found with serial ${serialNumber}`);
                        return null;
                    }
                } else {
                    console.log(`[DeviceService] No devices found in the system`);
                    return null;
                }
            } catch (apiError) {
                console.error(`[DeviceService] API call failed:`, apiError);
                if (typeof apiError === 'object' && apiError !== null) {
                    console.error('[DeviceService] Error details:', {
                        message: (apiError as any).message,
                        code: (apiError as any).code,
                        statusCode: (apiError as any).statusCode,
                        body: (apiError as any).body
                    });
                }
                throw apiError;
            }
        } catch (error) {
            console.error('[DeviceService] Error checking device serial:', error);
            logger.error('Error checking device serial:', error);
            throw error;
        }
    }

    public async addDeviceSerial(serialNumber: string, description: string): Promise<void> {
        try {
            console.log(`[DeviceService] Adding device serial: ${serialNumber}`);
            const client = await this.getClient();
    
            const requestBody = {
                importedDeviceIdentities: [
                    {
                        importedDeviceIdentifier: serialNumber,
                        importedDeviceIdentityType: 'serialNumber',
                        description: description
                    }
                ],
                overwriteImportedDeviceIdentities: false
            };
    
            console.log(`[DeviceService] Posting to deviceManagement/importedDeviceIdentities/importDeviceIdentityList...`);
            await client
                .api('/deviceManagement/importedDeviceIdentities/importDeviceIdentityList')
                .version('beta')
                .post(requestBody);
    
            console.log(`[DeviceService] Device added successfully.`);
        } catch (error) {
            console.error('[DeviceService] Error adding device serial:', error);
            logger.error('Error adding device serial:', error);
            throw error;
        }
    }

    public validateDevice(serialNumber: string): DeviceInfo {
        const serialLength = serialNumber.length;

        if (serialLength < 12) {
            return {
                type: DeviceType.LogitechDevice,
                isValid: false,
                validationMessage: `Serial number too short: ${serialLength}/12 characters`
            };
        }

        if (serialLength > 12) {
            return {
                type: DeviceType.LogitechDevice,
                isValid: false,
                validationMessage: `Serial number too long: ${serialLength}/12 characters`
            };
        }

        if (!serialNumber.endsWith('2')) {
            return {
                type: DeviceType.LogitechDevice,
                isValid: false,
                validationMessage: 'Serial number must end with "2"'
            };
        }

        return {
            type: DeviceType.LogitechDevice,
            isValid: true,
            validationMessage: 'Valid Logitech device serial number'
        };
    }

    // Helper method for checking if device is a Logitech device
    public isLogitechDevice(serialNumber: string): boolean {
        return serialNumber.length === 12 && serialNumber.endsWith('2');
    }
} 