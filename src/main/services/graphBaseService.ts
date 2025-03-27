import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import * as dotenv from 'dotenv';
import { createLogger } from '../utils/logger';

dotenv.config();

const logger = createLogger('GraphBaseService');

export class GraphBaseService {
    protected graphClient: Client | null = null;
    protected tokenCredential: ClientSecretCredential | null = null;

    protected constructor() {
        this.initializeClient();
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

    protected async initializeClient() {
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
} 