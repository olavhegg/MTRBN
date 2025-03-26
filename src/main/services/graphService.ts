import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import * as dotenv from 'dotenv';
import { createLogger } from '../utils/logger';

dotenv.config();

const logger = createLogger('GraphService');

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
            
            const clientId = process.env.AZURE_CLIENT_ID;
            const clientSecret = process.env.AZURE_CLIENT_SECRET;
            const tenantId = process.env.AZURE_TENANT_ID;

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
                }
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
}

export default GraphService; 