import { GraphBaseService } from './graphBaseService';
import { createLogger } from '../utils/logger';

const logger = createLogger('GroupService');

export class GroupService extends GraphBaseService {
    private static instance: GroupService;

    private constructor() {
        super();
    }

    public static getInstance(): GroupService {
        if (!GroupService.instance) {
            GroupService.instance = new GroupService();
        }
        return GroupService.instance;
    }

    public async checkGroupMembership(userId: string, groupId: string): Promise<boolean> {
        try {
            const client = await this.getClient();
            
            // First get the user's ID if userId is a UPN
            let userObjectId = userId;
            if (userId.includes('@')) {
                try {
                    const user = await client.api(`/users/${userId}`)
                        .select('id')
                        .get();
                    userObjectId = user.id;
                } catch (error) {
                    logger.error(`Error retrieving user ID for UPN ${userId}:`, error);
                    return false;
                }
            }
            
            // Get the actual group ID from environment variables if a placeholder is used
            let actualGroupId = groupId;
            if (groupId === 'mtr-group-id') {
                actualGroupId = process.env['MTR-ResourceAccountsID'] || '';
            } else if (groupId === 'room-group-id') {
                actualGroupId = process.env.SHARED_GROUP_ID || '';
            } else if (groupId === 'pro-group-id') {
                actualGroupId = process.env.PRO_GROUP_ID || '';
            }
            
            if (!actualGroupId) {
                logger.error(`Group ID not found for ${groupId}`);
                return false;
            }
            
            // Instead of using memberOf with filter which is problematic,
            // directly check if the user is in the group's members list
            const response = await client.api(`/groups/${actualGroupId}/members`)
                .select('id')
                .get();
                
            const members = response.value;
            return members.some((member: any) => member.id === userObjectId);
        } catch (error) {
            logger.error('Error checking group membership:', error);
            return false;
        }
    }

    public async addUserToGroup(userId: string, groupId: string): Promise<void> {
        try {
            const client = await this.getClient();
            await client.api(`https://graph.microsoft.com/beta/groups/${groupId}/members/$ref`)
                .post({
                    "@odata.id": `https://graph.microsoft.com/beta/directoryObjects/${userId}`
                });
        } catch (error) {
            logger.error('Error adding user to group:', error);
            throw error;
        }
    }

    /**
     * Checks if user is a member of the MTR Resource Accounts group
     */
    public async checkMtrGroupMembership(upn: string): Promise<{ isMember: boolean; message: string }> {
        try {
            logger.info(`Checking MTR group membership for: ${upn}`);
            const client = await this.getClient();
            
            // First get the user ID
            const user = await client.api(`/users/${upn}`)
                .select('id')
                .get();
            
            if (!user || !user.id) {
                return {
                    isMember: false,
                    message: "Account not found"
                };
            }
            
            // Get MTR Resource Account group ID from environment variables
            const groupName = 'MTR Resource Accounts';
            const groupId = process.env['MTR-ResourceAccountsID'];
            
            if (!groupId) {
                logger.error('MTR Resource Accounts group ID not found in environment variables');
                return {
                    isMember: false,
                    message: `${groupName} group ID not configured`
                };
            }
            
            // Use the more reliable method to check membership
            try {
                // Get all members of the group
                const response = await client.api(`/groups/${groupId}/members`)
                    .select('id')
                    .get();
                
                // Check if user is in the list
                const members = response.value;
                const isMember = members.some((member: any) => member.id === user.id);
                
                if (isMember) {
                    return {
                        isMember: true,
                        message: `Member of ${groupName}`
                    };
                } else {
                    return {
                        isMember: false,
                        message: `Not a member of ${groupName}`
                    };
                }
            } catch (error) {
                logger.error('Error checking MTR group membership:', error);
                return {
                    isMember: false,
                    message: `Error checking ${groupName} membership`
                };
            }
        } catch (error) {
            logger.error('Error in overall group membership check:', error);
            return {
                isMember: false,
                message: `Error: ${(error as Error).message}`
            };
        }
    }

    /**
     * Checks if user is a member of the Room Accounts group
     */
    public async checkRoomGroupMembership(upn: string): Promise<{ isMember: boolean; message: string }> {
        try {
            logger.info(`Checking Room group membership for: ${upn}`);
            const client = await this.getClient();
            
            // First get the user ID
            const user = await client.api(`/users/${upn}`)
                .select('id')
                .get();
            
            if (!user || !user.id) {
                return {
                    isMember: false,
                    message: "Account not found"
                };
            }
            
            // Get Room Account group ID
            const groupName = 'Room Accounts';
            const groupId = process.env.SHARED_GROUP_ID;
            
            if (!groupId) {
                logger.error('Shared Group ID not found in environment variables');
                return {
                    isMember: false,
                    message: `${groupName} group ID not configured`
                };
            }
            
            // Use the more reliable method to check membership
            try {
                // Get all members of the group
                const response = await client.api(`/groups/${groupId}/members`)
                    .select('id')
                    .get();
                
                // Check if user is in the list
                const members = response.value;
                const isMember = members.some((member: any) => member.id === user.id);
                
                if (isMember) {
                    return {
                        isMember: true,
                        message: `Member of ${groupName}`
                    };
                } else {
                    return {
                        isMember: false,
                        message: `Not a member of ${groupName}`
                    };
                }
            } catch (error) {
                logger.error('Error checking Room group membership:', error);
                return {
                    isMember: false,
                    message: `Error checking ${groupName} membership`
                };
            }
        } catch (error) {
            logger.error('Error in overall Room group membership check:', error);
            return {
                isMember: false,
                message: `Error: ${(error as Error).message}`
            };
        }
    }

    /**
     * Checks if user is a member of the Teams Rooms Pro license group
     */
    public async checkProGroupMembership(upn: string): Promise<{ isMember: boolean; message: string }> {
        try {
            logger.info(`Checking Teams Rooms Pro license group membership for: ${upn}`);
            const client = await this.getClient();
            
            // First get the user ID
            const user = await client.api(`/users/${upn}`)
                .select('id')
                .get();
            
            if (!user || !user.id) {
                return {
                    isMember: false,
                    message: "Account not found"
                };
            }
            
            // Get Pro license group ID
            const groupName = 'MTR-Teams-Room-License-Teams Rooms Pro';
            const groupId = process.env.PRO_GROUP_ID;
            
            if (!groupId) {
                logger.error('Pro Group ID not found in environment variables');
                return {
                    isMember: false,
                    message: `${groupName} group ID not configured`
                };
            }
            
            // Use the more reliable method to check membership
            try {
                // Get all members of the group
                const response = await client.api(`/groups/${groupId}/members`)
                    .select('id')
                    .get();
                
                // Check if user is in the list
                const members = response.value;
                const isMember = members.some((member: any) => member.id === user.id);
                
                if (isMember) {
                    return {
                        isMember: true,
                        message: `Member of ${groupName}`
                    };
                } else {
                    return {
                        isMember: false,
                        message: `Not a member of ${groupName}`
                    };
                }
            } catch (error) {
                logger.error('Error checking Pro license group membership:', error);
                return {
                    isMember: false,
                    message: `Error checking ${groupName} membership`
                };
            }
        } catch (error) {
            logger.error('Error in overall Pro license group membership check:', error);
            return {
                isMember: false,
                message: `Error: ${(error as Error).message}`
            };
        }
    }

    /**
     * Adds a user to the MTR Resource Accounts group
     */
    public async addUserToMtrGroup(upn: string): Promise<{ success: boolean; message: string }> {
        try {
            logger.info(`Adding user ${upn} to MTR Resource Accounts group`);
            const client = await this.getClient();
            
            // Get user ID
            const user = await client.api(`/users/${upn}`)
                .select('id')
                .get();
            
            if (!user || !user.id) {
                return {
                    success: false,
                    message: "Account not found"
                };
            }
            
            // Get MTR group ID from environment variables
            const groupName = 'MTR Resource Accounts';
            const groupId = process.env['MTR-ResourceAccountsID'];
            
            if (!groupId) {
                logger.error('MTR Resource Accounts group ID not found in environment variables');
                return {
                    success: false,
                    message: `${groupName} group ID not configured`
                };
            }
            
            // Check if already a member
            const membershipCheck = await this.checkMtrGroupMembership(upn);
            if (membershipCheck.isMember) {
                return {
                    success: true,
                    message: `User is already a member of ${groupName}`
                };
            }
            
            // Add user to group
            await client.api(`/groups/${groupId}/members/$ref`)
                .post({
                    "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${user.id}`
                });
            
            return {
                success: true,
                message: `User added to ${groupName} successfully`
            };
        } catch (error) {
            logger.error('Error adding user to MTR group:', error);
            return {
                success: false,
                message: `Error: ${(error as Error).message}`
            };
        }
    }

    /**
     * Removes a user from the MTR Resource Accounts group
     */
    public async removeUserFromMtrGroup(upn: string): Promise<{ success: boolean; message: string }> {
        try {
            logger.info(`Removing user ${upn} from MTR Resource Accounts group`);
            const client = await this.getClient();
            
            // Get user ID
            const user = await client.api(`/users/${upn}`)
                .select('id')
                .get();
            
            if (!user || !user.id) {
                return {
                    success: false,
                    message: "Account not found"
                };
            }
            
            // Get MTR group ID from environment variables
            const groupName = 'MTR Resource Accounts';
            const groupId = process.env['MTR-ResourceAccountsID'];
            
            if (!groupId) {
                logger.error('MTR Resource Accounts group ID not found in environment variables');
                return {
                    success: false,
                    message: `${groupName} group ID not configured`
                };
            }
            
            // Check if user is a member
            const membershipCheck = await this.checkMtrGroupMembership(upn);
            if (!membershipCheck.isMember) {
                return {
                    success: true,
                    message: `User is not a member of ${groupName}`
                };
            }
            
            // Remove user from group
            await client.api(`/groups/${groupId}/members/${user.id}/$ref`)
                .delete();
            
            return {
                success: true,
                message: `User removed from ${groupName} successfully`
            };
        } catch (error) {
            logger.error('Error removing user from MTR group:', error);
            return {
                success: false,
                message: `Error: ${(error as Error).message}`
            };
        }
    }

    /**
     * Adds a user to the Room Accounts group
     */
    public async addUserToRoomGroup(upn: string): Promise<{ success: boolean; message: string }> {
        try {
            logger.info(`Adding user ${upn} to Room Accounts group`);
            const client = await this.getClient();
            
            // Get user ID
            const user = await client.api(`/users/${upn}`)
                .select('id')
                .get();
            
            if (!user || !user.id) {
                return {
                    success: false,
                    message: "Account not found"
                };
            }
            
            // Get Room group ID
            const groupName = 'Room Accounts';
            const groupId = process.env.SHARED_GROUP_ID;
            
            if (!groupId) {
                logger.error('Shared Group ID not found in environment variables');
                return {
                    success: false,
                    message: `${groupName} group ID not configured`
                };
            }
            
            // Check if already a member
            const membershipCheck = await this.checkRoomGroupMembership(upn);
            if (membershipCheck.isMember) {
                return {
                    success: true,
                    message: `User is already a member of ${groupName}`
                };
            }
            
            // Add user to group
            await client.api(`/groups/${groupId}/members/$ref`)
                .post({
                    "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${user.id}`
                });
            
            return {
                success: true,
                message: `User added to ${groupName} successfully`
            };
        } catch (error) {
            logger.error('Error adding user to Room group:', error);
            return {
                success: false,
                message: `Error: ${(error as Error).message}`
            };
        }
    }

    /**
     * Removes a user from the Room Accounts group
     */
    public async removeUserFromRoomGroup(upn: string): Promise<{ success: boolean; message: string }> {
        try {
            logger.info(`Removing user ${upn} from Room Accounts group`);
            const client = await this.getClient();
            
            // Get user ID
            const user = await client.api(`/users/${upn}`)
                .select('id')
                .get();
            
            if (!user || !user.id) {
                return {
                    success: false,
                    message: "Account not found"
                };
            }
            
            // Get Room group ID
            const groupName = 'Room Accounts';
            const groupId = process.env.SHARED_GROUP_ID;
            
            if (!groupId) {
                logger.error('Shared Group ID not found in environment variables');
                return {
                    success: false,
                    message: `${groupName} group ID not configured`
                };
            }
            
            // Check if actually a member
            const membershipCheck = await this.checkRoomGroupMembership(upn);
            if (!membershipCheck.isMember) {
                return {
                    success: true,
                    message: `User is not a member of ${groupName}`
                };
            }
            
            // Remove user from group
            await client.api(`/groups/${groupId}/members/${user.id}/$ref`)
                .delete();
            
            return {
                success: true,
                message: `User removed from ${groupName} successfully`
            };
        } catch (error) {
            logger.error('Error removing user from Room group:', error);
            return {
                success: false,
                message: `Error: ${(error as Error).message}`
            };
        }
    }

    /**
     * Adds a user to the Teams Rooms Pro license group
     */
    public async addUserToProGroup(upn: string): Promise<{ success: boolean; message: string }> {
        try {
            logger.info(`Adding user ${upn} to Teams Rooms Pro license group`);
            const client = await this.getClient();
            
            // Get user ID
            const user = await client.api(`/users/${upn}`)
                .select('id')
                .get();
            
            if (!user || !user.id) {
                return {
                    success: false,
                    message: "Account not found"
                };
            }
            
            // Get Pro license group ID
            const groupName = 'MTR-Teams-Room-License-Teams Rooms Pro';
            const groupId = process.env.PRO_GROUP_ID;
            
            if (!groupId) {
                logger.error('Pro Group ID not found in environment variables');
                return {
                    success: false,
                    message: `${groupName} group ID not configured`
                };
            }
            
            // Check if already a member
            const membershipCheck = await this.checkProGroupMembership(upn);
            if (membershipCheck.isMember) {
                return {
                    success: true,
                    message: `User is already a member of ${groupName}`
                };
            }
            
            // Add user to group
            await client.api(`/groups/${groupId}/members/$ref`)
                .post({
                    "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${user.id}`
                });
            
            return {
                success: true,
                message: `User added to ${groupName} successfully`
            };
        } catch (error) {
            logger.error('Error adding user to Pro license group:', error);
            return {
                success: false,
                message: `Error: ${(error as Error).message}`
            };
        }
    }

    /**
     * Removes a user from the Teams Rooms Pro license group
     */
    public async removeUserFromProGroup(upn: string): Promise<{ success: boolean; message: string }> {
        try {
            logger.info(`Removing user ${upn} from Teams Rooms Pro license group`);
            const client = await this.getClient();
            
            // Get user ID
            const user = await client.api(`/users/${upn}`)
                .select('id')
                .get();
            
            if (!user || !user.id) {
                return {
                    success: false,
                    message: "Account not found"
                };
            }
            
            // Get Pro license group ID
            const groupName = 'MTR-Teams-Room-License-Teams Rooms Pro';
            const groupId = process.env.PRO_GROUP_ID;
            
            if (!groupId) {
                logger.error('Pro Group ID not found in environment variables');
                return {
                    success: false,
                    message: `${groupName} group ID not configured`
                };
            }
            
            // Check if actually a member
            const membershipCheck = await this.checkProGroupMembership(upn);
            if (!membershipCheck.isMember) {
                return {
                    success: true,
                    message: `User is not a member of ${groupName}`
                };
            }
            
            // Remove user from group
            await client.api(`/groups/${groupId}/members/${user.id}/$ref`)
                .delete();
            
            return {
                success: true,
                message: `User removed from ${groupName} successfully`
            };
        } catch (error) {
            logger.error('Error removing user from Pro license group:', error);
            return {
                success: false,
                message: `Error: ${(error as Error).message}`
            };
        }
    }

    /**
     * Get diagnostic information about the group service configuration
     * This is useful for debugging group membership issues
     */
    public async getDiagnosticInfo(): Promise<any> {
        return {
            mtrGroupId: process.env['MTR-ResourceAccountsID'] || 'not set',
            sharedGroupId: process.env.SHARED_GROUP_ID || 'not set',
            proGroupId: process.env.PRO_GROUP_ID || 'not set'
        };
    }
} 