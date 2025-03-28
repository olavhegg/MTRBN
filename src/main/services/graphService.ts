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
            const client = await this.groupService.getClient();
            
            // Get all subscribed SKUs
            const response = await client.api('/subscribedSkus')
                .get();
            
            // Teams Rooms Pro and Teams Shared Devices service plan IDs
            // Note: These IDs might need adjustment based on actual SKU IDs in the tenant
            const teamsRoomsProSkuId = '4bfd1bba-80ef-4d97-b412-cae9fce26935'; // Teams Rooms Pro
            const teamsSharedDevicesSkuId = '82023f10-53c7-4e1a-a6a1-4cf5855e05bd'; // Teams Shared Devices
            
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
                for (const sku of response.value) {
                    // Check if this SKU contains a Teams Rooms Pro service plan
                    const isTeamsRoomsPro = sku.servicePlans.some((plan: any) => 
                        plan.servicePlanName.includes('Teams Room Pro') ||
                        plan.servicePlanName.includes('MEETING_ROOM') ||
                        plan.servicePlanId === teamsRoomsProSkuId);
                    
                    // Check if this SKU contains a Teams Shared Devices service plan
                    const isTeamsSharedDevices = sku.servicePlans.some((plan: any) => 
                        plan.servicePlanName.includes('Teams Shared Device') ||
                        plan.servicePlanName.includes('MEETING_ROOM_DEVICE') ||
                        plan.servicePlanId === teamsSharedDevicesSkuId);
                    
                    if (isTeamsRoomsPro) {
                        teamsRoomsProInfo.total += sku.prepaidUnits.enabled;
                        teamsRoomsProInfo.used += sku.consumedUnits;
                        teamsRoomsProInfo.available = teamsRoomsProInfo.total - teamsRoomsProInfo.used;
                    }
                    
                    if (isTeamsSharedDevices) {
                        teamsSharedDevicesInfo.total += sku.prepaidUnits.enabled;
                        teamsSharedDevicesInfo.used += sku.consumedUnits;
                        teamsSharedDevicesInfo.available = teamsSharedDevicesInfo.total - teamsSharedDevicesInfo.used;
                    }
                }
            }
            
            return {
                success: true,
                licenses: {
                    teamsRoomsPro: teamsRoomsProInfo,
                    teamsSharedDevices: teamsSharedDevicesInfo
                }
            };
        } catch (error) {
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