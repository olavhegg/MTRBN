const { PublicClientApplication } = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
require('dotenv').config();

class AuthProvider {
    constructor() {
        this.msalConfig = {
            auth: {
                clientId: process.env.CLIENT_ID,
                authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
                clientSecret: process.env.CLIENT_SECRET,
            }
        };

        this.scopes = [
            'https://graph.microsoft.com/.default'
        ];

        this.msalClient = new PublicClientApplication(this.msalConfig);
    }

    async getToken() {
        try {
            const account = await this.msalClient.getTokenCache().getAllAccounts()[0];
            const response = await this.msalClient.acquireTokenSilent({
                account,
                scopes: this.scopes,
            });
            return response.accessToken;
        } catch (error) {
            const response = await this.msalClient.acquireTokenByClientCredential({
                scopes: this.scopes,
            });
            return response.accessToken;
        }
    }

    async getGraphClient() {
        const token = await this.getToken();
        return Client.init({
            authProvider: (done) => {
                done(null, token);
            },
        });
    }
}

module.exports = { AuthProvider }; 