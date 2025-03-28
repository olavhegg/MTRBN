import { GraphBaseService } from './graphBaseService';
import { DeviceService, DeviceType, DeviceInfo } from './deviceService';
import { UserService } from './userService';
import { GroupService } from './groupService';
import { createLogger } from '../utils/logger';

const logger = createLogger('GraphService');

class GraphService {
    private static instance: GraphService;
    private deviceService: DeviceService;
    private userService: UserService;
    private groupService: GroupService;

    private constructor() {
        this.deviceService = DeviceService.getInstance();
        this.userService = UserService.getInstance();
        this.groupService = GroupService.getInstance();
    }

    public static getInstance(): GraphService {
        if (!GraphService.instance) {
            GraphService.instance = new GraphService();
        }
        return GraphService.instance;
    }

    public async testConnection(): Promise<boolean> {
        return await this.deviceService.testConnection();
    }

    // Device Management Methods
    public async checkDeviceSerial(serialNumber: string) {
        return await this.deviceService.checkDeviceSerial(serialNumber);
    }

    public async addDeviceSerial(serialNumber: string, description: string) {
        return await this.deviceService.addDeviceSerial(serialNumber, description);
    }

    public validateDevice(serialNumber: string): DeviceInfo {
        return this.deviceService.validateDevice(serialNumber);
    }

    public isLogitechDevice(serialNumber: string): boolean {
        return this.deviceService.isLogitechDevice(serialNumber);
    }

    // User Management Methods
    public async checkUser(upn: string) {
        return await this.userService.checkUser(upn);
    }

    public async createUser(displayName: string, upn: string) {
        return await this.userService.createUser(displayName, upn);
    }

    public async updateUserDisplayName(upn: string, displayName: string) {
        return await this.userService.updateUserDisplayName(upn, displayName);
    }

    public async checkAccountUnlocked(upn: string) {
        return await this.userService.checkAccountUnlocked(upn);
    }

    // Group Management Methods
    public async checkGroupMembership(userId: string, groupId: string) {
        return await this.groupService.checkGroupMembership(userId, groupId);
    }

    public async addUserToGroup(userId: string, groupId: string) {
        return await this.groupService.addUserToGroup(userId, groupId);
    }

    public async checkMtrGroupMembership(upn: string) {
        return await this.groupService.checkMtrGroupMembership(upn);
    }

    public async checkRoomGroupMembership(upn: string) {
        return await this.groupService.checkRoomGroupMembership(upn);
    }

    public async checkProGroupMembership(upn: string) {
        return await this.groupService.checkProGroupMembership(upn);
    }

    public async addUserToMtrGroup(upn: string) {
        return await this.groupService.addUserToMtrGroup(upn);
    }

    public async removeUserFromMtrGroup(upn: string) {
        return await this.groupService.removeUserFromMtrGroup(upn);
    }

    public async addUserToRoomGroup(upn: string) {
        return await this.groupService.addUserToRoomGroup(upn);
    }

    public async removeUserFromRoomGroup(upn: string) {
        return await this.groupService.removeUserFromRoomGroup(upn);
    }

    public async addUserToProGroup(upn: string) {
        return await this.groupService.addUserToProGroup(upn);
    }

    public async removeUserFromProGroup(upn: string) {
        return await this.groupService.removeUserFromProGroup(upn);
    }

    public async getDiagnosticInfo() {
        return await this.groupService.getDiagnosticInfo();
    }

    /**
     * Gets license information for Microsoft Teams Rooms Pro and Microsoft Teams Shared Devices
     */
    public async getLicenseInfo(): Promise<{
        success: boolean;
        error?: string;
        licenses?: {
            teamsRoomsPro: {
                total: number;
                used: number;
                available: number;
            };
            teamsSharedDevices: {
                total: number;
                used: number;
                available: number;
            };
        };
    }> {
        try {
            logger.info('getLicenseInfo: Starting license information retrieval');
            console.log('getLicenseInfo: Getting client...');
            const client = await this.groupService.getClient();
            console.log('getLicenseInfo: Client obtained, fetching SKUs...');
            
            // Get all subscribed SKUs
            const response = await client.api('/subscribedSkus')
                .get();
                
            console.log('getLicenseInfo: SKUs response received:', JSON.stringify(response, null, 2));
            
            // Teams Rooms Pro and Teams Shared Devices service plan IDs
            // Note: These IDs might need adjustment based on actual SKU IDs in the tenant
            const teamsRoomsProSkuIds = [
                '4bfd1bba-80ef-4d97-b412-cae9fce26935', // Teams Rooms Pro
                '7d141db8-116a-41c8-8177-8583fb82ef3c', // Teams Rooms Standard
                '3150e09c-660d-4172-8d9f-315b02e68fa9', // Teams Rooms Basic
                'c32e5ec6-84ad-48b7-8c31-d530d2f1fddf', // Teams Room Standard
                '4fb214cb-a430-4a91-9c91-ae0e77d1b15e'  // Meeting Room
            ];
            
            const teamsSharedDevicesSkuIds = [
                '82023f10-53c7-4e1a-a6a1-4cf5855e05bd', // Teams Shared Devices
                'e17df04e-9e0a-4352-8ce4-8b406b05fbac', // Common Area Phone
                '3cbcca0e-ad57-4461-ab60-d432187892db', // Shared Comms Plan
                'd354a4f0-ec2c-4e2b-953e-dc6d2cfc6308'  // Teams Shared Device
            ];
            
            logger.info(`getLicenseInfo: Looking for service plans with IDs: 
                Teams Rooms Pro: ${teamsRoomsProSkuIds.join(', ')}, 
                Teams Shared Devices: ${teamsSharedDevicesSkuIds.join(', ')}`);
            
            let teamsRoomsProInfo = {
                total: 0,
                used: 0,
                available: 0
            };
            
            let teamsSharedDevicesInfo = {
                total: 0,
                used: 0,
                available: 0
            };
            
            // Process each SKU to find Teams licenses
            if (response && response.value) {
                logger.info(`getLicenseInfo: Found ${response.value.length} SKUs to process`);
                
                for (const sku of response.value) {
                    console.log(`getLicenseInfo: Processing SKU: ${sku.skuPartNumber} (${sku.skuId})`);
                    
                    // Validate that service plans exist
                    if (!sku.servicePlans || !Array.isArray(sku.servicePlans)) {
                        console.warn(`getLicenseInfo: No service plans found for SKU ${sku.skuPartNumber} or invalid format`, sku);
                        continue;
                    }
                    
                    console.log(`getLicenseInfo: Service plans in this SKU:`, 
                        sku.servicePlans.map((p: any) => `${p.servicePlanName} (${p.servicePlanId})`).join(', '));
                    
                    // Check if this SKU contains a Teams Rooms Pro service plan
                    const isTeamsRoomsPro = sku.servicePlans.some((plan: any) => {
                        const matches = 
                            plan.servicePlanName.toLowerCase().includes('teams room') ||
                            plan.servicePlanName.toLowerCase().includes('meeting room') ||
                            teamsRoomsProSkuIds.includes(plan.servicePlanId);
                            
                        if (matches) {
                            console.log(`getLicenseInfo: Found Teams Rooms Pro in plan: ${plan.servicePlanName} (${plan.servicePlanId})`);
                        }
                        
                        return matches;
                    });
                    
                    // Check if this SKU contains a Teams Shared Devices service plan
                    const isTeamsSharedDevices = sku.servicePlans.some((plan: any) => {
                        const matches = 
                            plan.servicePlanName.toLowerCase().includes('shared device') ||
                            plan.servicePlanName.toLowerCase().includes('common area') ||
                            teamsSharedDevicesSkuIds.includes(plan.servicePlanId);
                            
                        if (matches) {
                            console.log(`getLicenseInfo: Found Teams Shared Devices in plan: ${plan.servicePlanName} (${plan.servicePlanId})`);
                        }
                        
                        return matches;
                    });
                    
                    if (isTeamsRoomsPro) {
                        console.log(`getLicenseInfo: Adding Teams Rooms Pro license counts from SKU ${sku.skuPartNumber}`);
                        console.log(`getLicenseInfo: Enabled: ${sku.prepaidUnits.enabled}, Consumed: ${sku.consumedUnits}`);
                        teamsRoomsProInfo.total += sku.prepaidUnits.enabled;
                        teamsRoomsProInfo.used += sku.consumedUnits;
                        teamsRoomsProInfo.available = teamsRoomsProInfo.total - teamsRoomsProInfo.used;
                    }
                    
                    if (isTeamsSharedDevices) {
                        console.log(`getLicenseInfo: Adding Teams Shared Devices license counts from SKU ${sku.skuPartNumber}`);
                        console.log(`getLicenseInfo: Enabled: ${sku.prepaidUnits.enabled}, Consumed: ${sku.consumedUnits}`);
                        teamsSharedDevicesInfo.total += sku.prepaidUnits.enabled;
                        teamsSharedDevicesInfo.used += sku.consumedUnits;
                        teamsSharedDevicesInfo.available = teamsSharedDevicesInfo.total - teamsSharedDevicesInfo.used;
                    }
                }
            } else {
                logger.warn('getLicenseInfo: No SKUs found in the response');
                console.log('getLicenseInfo: Response data structure:', response);
            }
            
            logger.info(`getLicenseInfo: Final license counts - 
                Teams Rooms Pro: Total=${teamsRoomsProInfo.total}, Used=${teamsRoomsProInfo.used}, Available=${teamsRoomsProInfo.available}
                Teams Shared Devices: Total=${teamsSharedDevicesInfo.total}, Used=${teamsSharedDevicesInfo.used}, Available=${teamsSharedDevicesInfo.available}`);
            
            return {
                success: true,
                licenses: {
                    teamsRoomsPro: teamsRoomsProInfo,
                    teamsSharedDevices: teamsSharedDevicesInfo
                }
            };
        } catch (error) {
            console.error('getLicenseInfo: Detailed error:', error);
            if (error instanceof Error) {
                console.error(`getLicenseInfo: Error name: ${error.name}, message: ${error.message}`);
                if ('code' in error) {
                    console.error(`getLicenseInfo: Error code: ${(error as any).code}`);
                }
                if ('statusCode' in error) {
                    console.error(`getLicenseInfo: Status code: ${(error as any).statusCode}`);
                }
                if ('body' in error) {
                    console.error(`getLicenseInfo: Response body: ${JSON.stringify((error as any).body, null, 2)}`);
                }
            }
            
            logger.error('Error getting license information:', error);
            return {
                success: false,
                error: `Failed to get license information: ${(error as Error).message || String(error)}`
            };
        }
    }
}

export { GraphService, DeviceType, DeviceInfo };
export default GraphService; 