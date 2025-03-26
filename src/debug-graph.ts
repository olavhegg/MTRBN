import * as dotenv from 'dotenv';
import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';

// Load environment variables
dotenv.config();

// This function will be our main debug entry point
async function debugGraphConnection() {
    console.log('=============================================');
    console.log('GRAPH API DEBUG SCRIPT - MINIMAL CONNECTION TEST');
    console.log('=============================================');
    
    // Check environment variables
    console.log('\nChecking environment variables:');
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const tenantId = process.env.TENANT_ID;
    
    console.log(`CLIENT_ID: ${clientId ? '✓ Set (value: ' + clientId.substring(0, 4) + '...)' : '✗ Missing'}`);
    console.log(`CLIENT_SECRET: ${clientSecret ? '✓ Set (length: ' + clientSecret.length + ')' : '✗ Missing'}`);
    console.log(`TENANT_ID: ${tenantId ? '✓ Set (value: ' + tenantId.substring(0, 4) + '...)' : '✗ Missing'}`);
    
    if (!clientId || !clientSecret || !tenantId) {
        console.error('\n❌ ERROR: Missing required environment variables. Check your .env file.');
        console.log('Make sure you have a .env file in the root directory with the following variables:');
        console.log('CLIENT_ID=your_client_id');
        console.log('CLIENT_SECRET=your_client_secret');
        console.log('TENANT_ID=your_tenant_id');
        return;
    }
    
    console.log('\nAttempting to create token credential...');
    
    try {
        // Step 1: Create token credential
        const credential = new ClientSecretCredential(
            tenantId,
            clientId,
            clientSecret
        );
        
        console.log('✓ Token credential created successfully');
        
        // Step 2: Try to get a token directly
        console.log('\nAttempting to acquire token directly...');
        try {
            const tokenResponse = await credential.getToken(['https://graph.microsoft.com/.default']);
            console.log('✓ Token acquired successfully!');
            console.log(`Token starts with: ${tokenResponse.token.substring(0, 10)}...`);
            console.log(`Token expires on: ${new Date(tokenResponse.expiresOnTimestamp).toLocaleString()}`);
        } catch (tokenError: any) {
            console.error('❌ Failed to acquire token:');
            console.error(`- Error name: ${tokenError.name || 'Unknown'}`);
            console.error(`- Error message: ${tokenError.message || 'No message'}`);
            
            if (tokenError.code) {
                console.error(`- Error code: ${tokenError.code}`);
            }
            
            console.log('\nThis error indicates an issue with your Azure AD app credentials or permissions.');
            console.log('Possible solutions:');
            console.log('1. Verify your CLIENT_ID, CLIENT_SECRET, and TENANT_ID are correct');
            console.log('2. Check if your client secret has expired (they typically expire after 1-2 years)');
            console.log('3. Ensure your Azure AD app has the correct API permissions');
            return;
        }
        
        // Step 3: Initialize the Graph client
        console.log('\nInitializing Microsoft Graph client...');
        let graphClient: Client | null = null;
        
        try {
            graphClient = Client.init({
                authProvider: async (done) => {
                    try {
                        const token = await credential.getToken(['https://graph.microsoft.com/.default']);
                        done(null, token.token);
                    } catch (error: any) {
                        done(new Error(`Authentication error: ${error.message}`), null);
                    }
                },
                baseUrl: 'https://graph.microsoft.com/beta'
            });
            
            console.log('✓ Graph client initialized successfully');
        } catch (clientError: any) {
            console.error('❌ Failed to initialize Graph client:');
            console.error(`- Error: ${clientError.message || 'Unknown error'}`);
            return;
        }
        
        // Step 4: Make a simple API request
        console.log('\nMaking test request to /organization endpoint...');
        
        try {
            const result = await graphClient.api('/organization').get();
            console.log('✓ API request successful!');
            console.log(`Retrieved ${result.value.length} organization(s)`);
            console.log('\nThis confirms your application can successfully connect to Microsoft Graph API.');
        } catch (apiError: any) {
            console.error('❌ API request failed:');
            console.error(`- Error message: ${apiError.message || 'Unknown error'}`);
            
            if (apiError.statusCode) {
                console.error(`- Status code: ${apiError.statusCode}`);
            }
            
            if (apiError.body) {
                try {
                    const errorBody = JSON.parse(apiError.body);
                    console.error('- Error details:', errorBody.error || errorBody);
                } catch {
                    console.error(`- Error body: ${apiError.body}`);
                }
            }
            
            console.log('\nThis error indicates a problem with the API request or permissions.');
            console.log('Possible solutions:');
            console.log('1. Ensure your app has the "Organization.Read.All" permission');
            console.log('2. Check if the permission has been admin-consented in Azure AD');
            console.log('3. Verify your network allows connections to Microsoft Graph endpoints');
            return;
        }
        
        // Step 5: Test Intune permissions specifically
        console.log('\nTesting Intune device management permissions...');
        
        try {
            // This is a simple test to check if we can access device management endpoints
            const result = await graphClient.api('/deviceManagement/importedDeviceIdentities').top(1).get();
            console.log('✓ Intune device management API request successful!');
            console.log(`Retrieved ${result.value.length} device(s) from the first page`);
            console.log('\nThis confirms your application can successfully access Intune device management.');
        } catch (intuneError: any) {
            console.error('❌ Intune API request failed:');
            console.error(`- Error message: ${intuneError.message || 'Unknown error'}`);
            
            if (intuneError.statusCode) {
                console.error(`- Status code: ${intuneError.statusCode}`);
            }
            
            console.log('\nThis error indicates a problem with Intune-specific permissions.');
            console.log('Possible solutions:');
            console.log('1. Ensure your app has the "DeviceManagementServiceConfig.ReadWrite.All" permission');
            console.log('2. Check if the permission has been admin-consented in Azure AD');
            console.log('3. Make sure you\'re using the beta endpoint for Intune operations');
            return;
        }
        
        // All tests passed!
        console.log('\n=========================================');
        console.log('✅ ALL GRAPH API CONNECTION TESTS PASSED!');
        console.log('=========================================');
        console.log('Your application is correctly configured to use Microsoft Graph API with Intune.');
        
    } catch (error: any) {
        // Catch any other unexpected errors
        console.error('\n❌ Unexpected error occurred:');
        console.error(error);
        
        if (error instanceof Error) {
            console.error(`- Error name: ${error.name}`);
            console.error(`- Error message: ${error.message}`);
            console.error(`- Error stack: ${error.stack}`);
        }
    }
}

// Run the debug function
debugGraphConnection().catch(error => {
    console.error('Unhandled error in debug script:', error);
}); 