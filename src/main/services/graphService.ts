import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import * as dotenv from 'dotenv';
import { createLogger } from '../utils/logger';

dotenv.config();

const logger = createLogger('GraphService');

interface DeviceIdentity {
    importedDeviceIdentifier: string;
    description: string;
    enrollmentState: string;
    importedDeviceIdentityType: string;
    platform: string;
    lastContactedDateTime?: string;
}

interface UserAccount {
    displayName: string;
    userPrincipalName: string;
    accountEnabled: boolean;
    passwordProfile?: {
        password: string;
        forceChangePasswordNextSignIn: boolean;
        passwordPolicies: string;
    };
}

export enum DeviceType {
    LogitechDevice = 'Logitech Device'
}

export interface DeviceInfo {
    type: DeviceType;
    isValid: boolean;
    validationMessage: string;
}

class GraphService {
    private static instance: GraphService;
    private graphClient: Client | null = null;
    private tokenCredential: ClientSecretCredential | null = null;

    private constructor() {
        this.initializeClient();
    }

    public static getInstance(): GraphService {
        if (!GraphService.instance) {
            GraphService.instance = new GraphService();
        }
        return GraphService.instance;
    }

    public async getClient(): Promise<Client> {
        console.log('[GraphService] getClient called');
        if (!this.graphClient) {
            console.log('[GraphService] No existing client, initializing...');
            await this.initializeClient();
        } else {
            console.log('[GraphService] Using existing graph client');
        }
        return this.graphClient!;
    }

    private async initializeClient() {
        try {
            console.log('[GraphService] Initializing Graph client');
            logger.info('Initializing Graph client');
            
            const clientId = process.env.CLIENT_ID;
            const clientSecret = process.env.CLIENT_SECRET;
            const tenantId = process.env.TENANT_ID;

            console.log('[GraphService] Checking environment variables:');
            console.log(`[GraphService] CLIENT_ID: ${clientId ? '✓ Set (value starts with: ' + clientId.substring(0, 4) + '...)' : '✗ Missing'}`);
            console.log(`[GraphService] CLIENT_SECRET: ${clientSecret ? '✓ Set (length: ' + clientSecret.length + ')' : '✗ Missing'}`);
            console.log(`[GraphService] TENANT_ID: ${tenantId ? '✓ Set (value starts with: ' + tenantId.substring(0, 4) + '...)' : '✗ Missing'}`);

            if (!clientId || !clientSecret || !tenantId) {
                const error = new Error('Missing required Azure AD credentials in environment variables');
                console.error('[GraphService] Missing credentials:', error);
                throw error;
            }

            console.log('[GraphService] Creating token credential...');
            this.tokenCredential = new ClientSecretCredential(
                tenantId,
                clientId,
                clientSecret
            );
            console.log('[GraphService] Token credential created');

            console.log('[GraphService] Initializing Graph client...');
            this.graphClient = Client.init({
                authProvider: async (done) => {
                    try {
                        console.log('[GraphService] Auth provider called, getting token...');
                        const token = await this.tokenCredential!.getToken(['https://graph.microsoft.com/.default']);
                        console.log('[GraphService] Token acquired successfully');
                        done(null, token.token);
                    } catch (error) {
                        console.error('[GraphService] Error getting token:', error);
                        logger.error('Error getting token:', error);
                        done(error as Error, null);
                    }
                }
            });

            console.log('[GraphService] Graph client initialized successfully');
            logger.info('Graph client initialized successfully');
        } catch (error) {
            console.error('[GraphService] Failed to initialize Graph client:', error);
            logger.error('Failed to initialize Graph client:', error);
            throw error;
        }
    }

    public async testConnection(): Promise<boolean> {
        try {
            logger.info('Testing Graph API connection');
            const client = await this.getClient();
            await client.api('https://graph.microsoft.com/beta/organization').get();
            logger.info('Graph API connection test successful');
            return true;
        } catch (error) {
            logger.error('Graph API connection test failed:', error);
            
            // Log more detailed information about the error
            if (error instanceof Error) {
                logger.error(`Error name: ${error.name}, message: ${error.message}`);
                if ('statusCode' in error) {
                    logger.error(`Status code: ${(error as any).statusCode}`);
                }
                if ('code' in error) {
                    logger.error(`Error code: ${(error as any).code}`);
                }
            }
            
            return false;
        }
    }

    // Device Management
    public async checkDeviceSerial(serialNumber: string): Promise<DeviceIdentity | null> {
        try {
            console.log(`[GraphService] Checking device serial: ${serialNumber}`);
            const client = await this.getClient();
            console.log(`[GraphService] Got client, making API call...`);
            
            // Get all devices and filter in JavaScript - this approach works reliably
            const endpoint = 'https://graph.microsoft.com/beta/deviceManagement/importedDeviceIdentities';
            console.log(`[GraphService] Calling API endpoint to get all devices: ${endpoint}`);
            
            try {
                const result = await client.api(endpoint).get();
                
                console.log(`[GraphService] API call successful, found ${result.value ? result.value.length : 0} devices`);
                
                // Find the device with the matching serial number
                if (result.value && result.value.length > 0) {
                    const device = result.value.find((d: DeviceIdentity) => 
                        d.importedDeviceIdentifier === serialNumber
                    );
                    
                    if (device) {
                        console.log(`[GraphService] Found device with serial ${serialNumber}:`, device);
                        return device;
                    } else {
                        console.log(`[GraphService] No device found with serial ${serialNumber}`);
                        return null;
                    }
                } else {
                    console.log(`[GraphService] No devices found in the system`);
                    return null;
                }
            } catch (apiError) {
                console.error(`[GraphService] API call failed:`, apiError);
                if (typeof apiError === 'object' && apiError !== null) {
                    console.error('[GraphService] Error details:', {
                        message: (apiError as any).message,
                        code: (apiError as any).code,
                        statusCode: (apiError as any).statusCode,
                        body: (apiError as any).body
                    });
                }
                throw apiError;
            }
        } catch (error) {
            console.error('[GraphService] Error checking device serial:', error);
            logger.error('Error checking device serial:', error);
            throw error;
        }
    }

    public async addDeviceSerial(serialNumber: string, description: string): Promise<void> {
        try {
            console.log(`[GraphService] Adding device serial: ${serialNumber}`);
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
    
            console.log(`[GraphService] Posting to deviceManagement/importedDeviceIdentities/importDeviceIdentityList...`);
            await client
                .api('/deviceManagement/importedDeviceIdentities/importDeviceIdentityList')
                .version('beta')
                .post(requestBody);
    
            console.log(`[GraphService] Device added successfully.`);
        } catch (error) {
            console.error('[GraphService] Error adding device serial:', error);
            logger.error('Error adding device serial:', error);
            throw error;
        }
    }
    
    

    // Device Type Validation
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

    // User Management
    public async checkUser(upn: string): Promise<any> {
        try {
            const client = await this.getClient();
            return await client.api(`https://graph.microsoft.com/beta/users/${upn}`).get();
        } catch (error) {
            logger.error('Error checking user:', error);
            throw error;
        }
    }

    public async createUser(displayName: string, upn: string): Promise<any> {
        try {
            const client = await this.getClient();
            const user: UserAccount = {
                displayName,
                userPrincipalName: upn,
                accountEnabled: true,
                passwordProfile: {
                    password: process.env.GENERICPASSWORD || 'ChangeMe123!',
                    forceChangePasswordNextSignIn: false,
                    passwordPolicies: 'DisablePasswordExpiration'
                }
            };

            return await client.api('https://graph.microsoft.com/beta/users').post(user);
        } catch (error) {
            logger.error('Error creating user:', error);
            throw error;
        }
    }

    public async updateUserDisplayName(upn: string, displayName: string): Promise<any> {
        try {
            const client = await this.getClient();
            const user = {
                displayName
            };

            logger.info(`Updating display name for ${upn} to "${displayName}"`);
            return await client.api(`https://graph.microsoft.com/beta/users/${upn}`).patch(user);
        } catch (error) {
            logger.error('Error updating user display name:', error);
            throw error;
        }
    }

    public async verifyUserPassword(upn: string): Promise<{ isValid: boolean; message: string }> {
        try {
            logger.info(`Verifying password for user: ${upn}`);
            const genericPassword = process.env.GENERICPASSWORD;
            
            if (!genericPassword) {
                return {
                    isValid: false,
                    message: "Generic password not defined in environment variables"
                };
            }
            
            // Since we cannot directly verify a password through Graph API,
            // we need to make a more thorough check of account properties
            try {
                const user = await this.checkUser(upn);
                
                if (!user) {
                    return {
                        isValid: false,
                        message: "Account not found"
                    };
                }
                
                if (!user.accountEnabled) {
                    return {
                        isValid: false,
                        message: "Account is disabled"
                    };
                }
                
                // Check for specific properties that might indicate password status
                // This is a best-effort approach since direct password verification is not possible
                
                // Check if user has passwordPolicies that match what we set for generic password
                const hasExpectedPolicy = user.passwordPolicies && 
                    user.passwordPolicies.includes('DisablePasswordExpiration');
                    
                // Check if user was recently created or reset password (within last day)
                const recentlyModified = user.lastPasswordChangeDateTime ? 
                    (new Date().getTime() - new Date(user.lastPasswordChangeDateTime).getTime()) < 86400000 : 
                    false;
                
                if (hasExpectedPolicy || recentlyModified) {
                    return {
                        isValid: true,
                        message: "Password appears to match generic password"
                    };
                }
                
                return {
                    isValid: false,
                    message: "Password likely does not match generic password"
                };
            } catch (error) {
                logger.error('Error checking user for password verification:', error);
                return {
                    isValid: false,
                    message: `Unable to verify: ${(error as Error).message}`
                };
            }
        } catch (error) {
            logger.error('Error verifying user password:', error);
            return {
                isValid: false,
                message: `Error: ${(error as Error).message}`
            };
        }
    }

    public async resetUserPassword(upn: string): Promise<any> {
        try {
            const client = await this.getClient();
            const genericPassword = process.env.GENERICPASSWORD;
            
            if (!genericPassword) {
                throw new Error("Generic password not defined in environment variables");
            }
            
            logger.info(`Resetting password for user: ${upn}`);
            
            // First, check if user exists
            const user = await this.checkUser(upn);
            if (!user) {
                throw new Error(`User ${upn} not found`);
            }
            
            // Create password profile
            const passwordProfile = {
                passwordProfile: {
                    password: genericPassword,
                    forceChangePasswordNextSignIn: false,
                    passwordPolicies: "DisablePasswordExpiration"
                }
            };
            
            // Execute the password reset
            const result = await client.api(`https://graph.microsoft.com/beta/users/${upn}`).patch(passwordProfile);
            logger.info(`Password reset successful for ${upn}`);
            
            return result;
        } catch (error) {
            logger.error('Error resetting user password:', error);
            throw error;
        }
    }

    // Group Management
    public async checkGroupMembership(userId: string, groupId: string): Promise<boolean> {
        try {
            const client = await this.getClient();
            const result = await client.api(`https://graph.microsoft.com/beta/users/${userId}/memberOf`)
                .filter(`id eq '${groupId}'`)
                .get();
            return result.value.length > 0;
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

    // Helper method for checking if device is a Logitech device
    public isLogitechDevice(serialNumber: string): boolean {
        return serialNumber.length === 12 && serialNumber.endsWith('2');
    }

    /**
     * Checks if a user account is unlocked (not blocked)
     */
    public async checkAccountUnlocked(upn: string): Promise<{ isUnlocked: boolean; message: string }> {
        try {
            logger.info(`Checking account unlock status for: ${upn}`);
            const client = await this.getClient();
            
            // Query the user with specific attributes
            const user = await client.api(`/users/${upn}`)
                .select('id,userPrincipalName,accountEnabled,userType')
                .get();
            
            if (!user) {
                return {
                    isUnlocked: false,
                    message: "Account not found"
                };
            }
            
            if (!user.accountEnabled) {
                return {
                    isUnlocked: false,
                    message: "Account is blocked/disabled"
                };
            }
            
            return {
                isUnlocked: true,
                message: "Account is active and not blocked"
            };
        } catch (error) {
            logger.error('Error checking account unlock status:', error);
            return {
                isUnlocked: false,
                message: `Error: ${(error as Error).message}`
            };
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
            
            if (!user) {
                return {
                    isMember: false,
                    message: "Account not found"
                };
            }
            
            // Get MTR Resource Account group ID
            // Note: In a real implementation, you'd have the group ID stored in environment variables
            // or other config, or search for the group by display name first
            const groupName = 'MTR Resource Accounts';
            let groupId = process.env.MTR_GROUP_ID;
            
            if (!groupId) {
                // Attempt to find the group by name
                try {
                    const groups = await client.api('/groups')
                        .filter(`displayName eq '${groupName}'`)
                        .get();
                    
                    if (groups && groups.value && groups.value.length > 0) {
                        groupId = groups.value[0].id;
                    } else {
                        return {
                            isMember: false,
                            message: `${groupName} group not found`
                        };
                    }
                } catch (error) {
                    logger.error('Error finding MTR group:', error);
                    return {
                        isMember: false,
                        message: `Error finding ${groupName} group`
                    };
                }
            }
            
            // Check if user is a member of the group
            try {
                const isMember = await client.api(`/groups/${groupId}/members`)
                    .filter(`id eq '${user.id}'`)
                    .count(true)
                    .get();
                
                const count = isMember["@odata.count"];
                
                if (count > 0) {
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
                logger.error('Error checking group membership:', error);
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
            
            if (!user) {
                return {
                    isMember: false,
                    message: "Account not found"
                };
            }
            
            // Get Room Account group ID
            const groupName = 'Room Accounts';
            let groupId = process.env.ROOM_GROUP_ID;
            
            if (!groupId) {
                // Attempt to find the group by name
                try {
                    const groups = await client.api('/groups')
                        .filter(`displayName eq '${groupName}'`)
                        .get();
                    
                    if (groups && groups.value && groups.value.length > 0) {
                        groupId = groups.value[0].id;
                    } else {
                        return {
                            isMember: false,
                            message: `${groupName} group not found`
                        };
                    }
                } catch (error) {
                    logger.error('Error finding Room group:', error);
                    return {
                        isMember: false,
                        message: `Error finding ${groupName} group`
                    };
                }
            }
            
            // Check if user is a member of the group
            try {
                const isMember = await client.api(`/groups/${groupId}/members`)
                    .filter(`id eq '${user.id}'`)
                    .count(true)
                    .get();
                
                const count = isMember["@odata.count"];
                
                if (count > 0) {
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
     * Adds a user to the specified group
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
            
            // Get MTR group ID
            const groupName = 'MTR Resource Accounts';
            let groupId = process.env.MTR_GROUP_ID;
            
            if (!groupId) {
                // Attempt to find the group by name
                try {
                    const groups = await client.api('/groups')
                        .filter(`displayName eq '${groupName}'`)
                        .get();
                    
                    if (groups && groups.value && groups.value.length > 0) {
                        groupId = groups.value[0].id;
                    } else {
                        return {
                            success: false,
                            message: `${groupName} group not found`
                        };
                    }
                } catch (error) {
                    logger.error('Error finding MTR group:', error);
                    return {
                        success: false,
                        message: `Error finding ${groupName} group`
                    };
                }
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
     * Removes a user from the specified group
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
            
            // Get MTR group ID
            const groupName = 'MTR Resource Accounts';
            let groupId = process.env.MTR_GROUP_ID;
            
            if (!groupId) {
                // Attempt to find the group by name
                try {
                    const groups = await client.api('/groups')
                        .filter(`displayName eq '${groupName}'`)
                        .get();
                    
                    if (groups && groups.value && groups.value.length > 0) {
                        groupId = groups.value[0].id;
                    } else {
                        return {
                            success: false,
                            message: `${groupName} group not found`
                        };
                    }
                } catch (error) {
                    logger.error('Error finding MTR group:', error);
                    return {
                        success: false,
                        message: `Error finding ${groupName} group`
                    };
                }
            }
            
            // Check if actually a member
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
            let groupId = process.env.ROOM_GROUP_ID;
            
            if (!groupId) {
                // Attempt to find the group by name
                try {
                    const groups = await client.api('/groups')
                        .filter(`displayName eq '${groupName}'`)
                        .get();
                    
                    if (groups && groups.value && groups.value.length > 0) {
                        groupId = groups.value[0].id;
                    } else {
                        return {
                            success: false,
                            message: `${groupName} group not found`
                        };
                    }
                } catch (error) {
                    logger.error('Error finding Room group:', error);
                    return {
                        success: false,
                        message: `Error finding ${groupName} group`
                    };
                }
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
            let groupId = process.env.ROOM_GROUP_ID;
            
            if (!groupId) {
                // Attempt to find the group by name
                try {
                    const groups = await client.api('/groups')
                        .filter(`displayName eq '${groupName}'`)
                        .get();
                    
                    if (groups && groups.value && groups.value.length > 0) {
                        groupId = groups.value[0].id;
                    } else {
                        return {
                            success: false,
                            message: `${groupName} group not found`
                        };
                    }
                } catch (error) {
                    logger.error('Error finding Room group:', error);
                    return {
                        success: false,
                        message: `Error finding ${groupName} group`
                    };
                }
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
            
            if (!user) {
                return {
                    isMember: false,
                    message: "Account not found"
                };
            }
            
            // Get Pro license group ID
            const groupName = 'MTR-Teams-Room-License-Teams Rooms Pro';
            let groupId = process.env.PRO_GROUP_ID;
            
            if (!groupId) {
                // Attempt to find the group by name
                try {
                    const groups = await client.api('/groups')
                        .filter(`displayName eq '${groupName}'`)
                        .get();
                    
                    if (groups && groups.value && groups.value.length > 0) {
                        groupId = groups.value[0].id;
                    } else {
                        return {
                            isMember: false,
                            message: `${groupName} group not found`
                        };
                    }
                } catch (error) {
                    logger.error('Error finding Pro license group:', error);
                    return {
                        isMember: false,
                        message: `Error finding ${groupName} group`
                    };
                }
            }
            
            // Check if user is a member of the group
            try {
                const isMember = await client.api(`/groups/${groupId}/members`)
                    .filter(`id eq '${user.id}'`)
                    .count(true)
                    .get();
                
                const count = isMember["@odata.count"];
                
                if (count > 0) {
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
            let groupId = process.env.PRO_GROUP_ID;
            
            if (!groupId) {
                // Attempt to find the group by name
                try {
                    const groups = await client.api('/groups')
                        .filter(`displayName eq '${groupName}'`)
                        .get();
                    
                    if (groups && groups.value && groups.value.length > 0) {
                        groupId = groups.value[0].id;
                    } else {
                        return {
                            success: false,
                            message: `${groupName} group not found`
                        };
                    }
                } catch (error) {
                    logger.error('Error finding Pro license group:', error);
                    return {
                        success: false,
                        message: `Error finding ${groupName} group`
                    };
                }
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
            let groupId = process.env.PRO_GROUP_ID;
            
            if (!groupId) {
                // Attempt to find the group by name
                try {
                    const groups = await client.api('/groups')
                        .filter(`displayName eq '${groupName}'`)
                        .get();
                    
                    if (groups && groups.value && groups.value.length > 0) {
                        groupId = groups.value[0].id;
                    } else {
                        return {
                            success: false,
                            message: `${groupName} group not found`
                        };
                    }
                } catch (error) {
                    logger.error('Error finding Pro license group:', error);
                    return {
                        success: false,
                        message: `Error finding ${groupName} group`
                    };
                }
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
}

export default GraphService; 