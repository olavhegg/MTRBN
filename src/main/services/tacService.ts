import GraphService from './graphService';
import { createLogger } from '../utils/logger';

const logger = createLogger('TACService');

interface TACDevice {
    name?: string;
    macAddress: string;
    location?: string;
    id: string;
    lastSeen?: string;
    status: 'Active' | 'Inactive';
}

class TACService {
    private static instance: TACService;
    private graphService: GraphService;

    private constructor() {
        this.graphService = GraphService.getInstance();
    }

    public static getInstance(): TACService {
        if (!TACService.instance) {
            TACService.instance = new TACService();
        }
        return TACService.instance;
    }

    public async getProvisionedDevices(): Promise<TACDevice[]> {
        try {
            logger.info('Fetching provisioned devices from TAC');
            const client = await this.graphService.getClient();

            // This is a placeholder endpoint - replace with actual TAC API endpoint
            const response = await client.api('/teamwork/devices')
                .select('id,name,macAddress,location,lastSeen,status')
                .get();

            logger.info(`Found ${response.value.length} devices in TAC`);
            
            return response.value.map((device: any) => ({
                id: device.id,
                name: device.name,
                macAddress: device.macAddress,
                location: device.location?.displayName,
                lastSeen: device.lastSeen,
                status: device.status
            }));
        } catch (error) {
            logger.error('Error fetching TAC devices:', error);
            throw error;
        }
    }

    public async checkDeviceExists(macAddress: string): Promise<boolean> {
        try {
            logger.info(`Checking if device exists in TAC: ${macAddress}`);
            const devices = await this.getProvisionedDevices();
            const exists = devices.some(device => 
                device.macAddress.toLowerCase() === macAddress.toLowerCase()
            );
            logger.info(`Device ${macAddress} ${exists ? 'found' : 'not found'} in TAC`);
            return exists;
        } catch (error) {
            logger.error(`Error checking device in TAC: ${macAddress}`, error);
            throw error;
        }
    }
}

export default TACService; 