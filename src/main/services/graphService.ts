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

    public async addDeviceSerial(serialNumber: string, description: string): Promise<DeviceIdentity> {
        try {
            console.log(`[GraphService] Adding device serial: ${serialNumber}`);
            const client = await this.getClient();
            
            const device: DeviceIdentity = {
                importedDeviceIdentifier: serialNumber,
                description: description,
                enrollmentState: 'notContacted',
                importedDeviceIdentityType: 'serialNumber',
                platform: 'unknown'
            };
            
            console.log(`[GraphService] Posting to deviceManagement API...`);
            const result = await client.api('https://graph.microsoft.com/beta/deviceManagement/importedDeviceIdentities')
                .post(device);
                
            console.log(`[GraphService] Device added successfully:`, result);
            return result;
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
            try {
                return await client.api(`https://graph.microsoft.com/beta/users/${upn}`).get();
            } catch (error) {
                // If not found with primary domain, try onmicrosoft.com domain
                const onmicrosoftUpn = upn.replace('@banenor.no', '@banenor.onmicrosoft.com');
                return await client.api(`https://graph.microsoft.com/beta/users/${onmicrosoftUpn}`).get();
            }
        } catch (error) {
            logger.error('Error checking user:', error);
            return null;
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
}

export default GraphService; 