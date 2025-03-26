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

    private async initializeClient() {
        try {
            logger.info('Initializing Graph client');
            
            const clientId = process.env.CLIENT_ID;
            const clientSecret = process.env.CLIENT_SECRET;
            const tenantId = process.env.TENANT_ID;

            if (!clientId || !clientSecret || !tenantId) {
                throw new Error('Missing required Azure AD credentials in environment variables');
            }

            this.tokenCredential = new ClientSecretCredential(
                tenantId,
                clientId,
                clientSecret
            );

            this.graphClient = Client.init({
                authProvider: async (done) => {
                    try {
                        const token = await this.tokenCredential!.getToken(['https://graph.microsoft.com/.default']);
                        done(null, token.token);
                    } catch (error) {
                        logger.error('Error getting token:', error);
                        done(error as Error, null);
                    }
                },
                baseUrl: 'https://graph.microsoft.com/beta'
            });

            logger.info('Graph client initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Graph client:', error);
            throw error;
        }
    }

    public async getClient(): Promise<Client> {
        if (!this.graphClient) {
            await this.initializeClient();
        }
        return this.graphClient!;
    }

    public async testConnection(): Promise<boolean> {
        try {
            logger.info('Testing Graph API connection');
            const client = await this.getClient();
            await client.api('/organization').get();
            logger.info('Graph API connection test successful');
            return true;
        } catch (error) {
            logger.error('Graph API connection test failed:', error);
            return false;
        }
    }

    // Device Management
    public async checkDeviceSerial(serialNumber: string): Promise<DeviceIdentity | null> {
        try {
            const client = await this.getClient();
            const result = await client.api('/deviceManagement/importedDeviceIdentities')
                .filter(`importedDeviceIdentifier eq '${serialNumber}'`)
                .get();
            
            return result.value[0] || null;
        } catch (error) {
            logger.error('Error checking device serial:', error);
            throw error;
        }
    }

    public async addDeviceSerial(serialNumber: string, description: string): Promise<DeviceIdentity> {
        try {
            const client = await this.getClient();
            const device: DeviceIdentity = {
                importedDeviceIdentifier: serialNumber,
                description: description,
                enrollmentState: 'notContacted'
            };

            return await client.api('/deviceManagement/importedDeviceIdentities')
                .post(device);
        } catch (error) {
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
                return await client.api(`/users/${upn}`).get();
            } catch (error) {
                // If not found with primary domain, try onmicrosoft.com domain
                const onmicrosoftUpn = upn.replace('@banenor.no', '@banenor.onmicrosoft.com');
                return await client.api(`/users/${onmicrosoftUpn}`).get();
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

            return await client.api('/users').post(user);
        } catch (error) {
            logger.error('Error creating user:', error);
            throw error;
        }
    }

    // Group Management
    public async checkGroupMembership(userId: string, groupId: string): Promise<boolean> {
        try {
            const client = await this.getClient();
            const result = await client.api(`/users/${userId}/memberOf`)
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
            await client.api(`/groups/${groupId}/members/$ref`)
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