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

    public async resetUserPassword(upn: string) {
        return await this.userService.resetUserPassword(upn);
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
}

export { GraphService, DeviceType, DeviceInfo };
export default GraphService; 