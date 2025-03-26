// A simple test script to verify Microsoft Graph client configuration
// Run with: node src/test-graph-client.js

require('dotenv').config();
const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');

async function testGraphClient() {
    console.log('=============================================');
    console.log('MICROSOFT GRAPH CLIENT TEST');
    console.log('=============================================');
    
    // Get credentials from env
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const tenantId = process.env.TENANT_ID;
    
    if (!clientId || !clientSecret || !tenantId) {
        console.error('Missing required environment variables');
        return;
    }
    
    try {
        // Step 1: Create token credential
        console.log('Creating credential...');
        const credential = new ClientSecretCredential(
            tenantId,
            clientId,
            clientSecret
        );
        
        // Step 2: Get token
        console.log('Getting token...');
        const token = await credential.getToken(['https://graph.microsoft.com/.default']);
        console.log('Token acquired successfully');
        
        // Try direct fetch first - this is known to work
        console.log('\n==== Testing direct fetch ====');
        console.log('Making direct fetch request to beta endpoint...');
        const response = await fetch('https://graph.microsoft.com/beta/deviceManagement/importedDeviceIdentities?$top=1', {
            headers: {
                'Authorization': `Bearer ${token.token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Direct fetch successful!');
            console.log(`Retrieved ${data.value.length} device(s)`);
        } else {
            console.error('❌ Direct fetch failed:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error response:', errorText);
        }
        
        // Try Microsoft Graph Client approach without baseUrl
        console.log('\n==== Testing Graph Client without baseUrl ====');
        const clientWithoutBaseUrl = Client.init({
            authProvider: async (done) => {
                try {
                    const token = await credential.getToken(['https://graph.microsoft.com/.default']);
                    done(null, token.token);
                } catch (error) {
                    done(error, null);
                }
            }
        });
        
        try {
            console.log('Making request to beta/deviceManagement/importedDeviceIdentities...');
            const result = await clientWithoutBaseUrl.api('beta/deviceManagement/importedDeviceIdentities')
                .top(1)
                .get();
            
            console.log('✅ API call successful!');
            console.log(`Retrieved ${result.value.length} device(s)`);
        } catch (error) {
            console.error('❌ API call failed:', error.message);
            if (error.statusCode) {
                console.error('Status code:', error.statusCode);
            }
            if (error.body) {
                console.error('Error response:', error.body);
            }
        }
        
        // Try Microsoft Graph Client with full URL
        console.log('\n==== Testing Graph Client with full URL ====');
        const clientForFullUrl = Client.init({
            authProvider: async (done) => {
                try {
                    const token = await credential.getToken(['https://graph.microsoft.com/.default']);
                    done(null, token.token);
                } catch (error) {
                    done(error, null);
                }
            }
        });
        
        try {
            console.log('Making request with full URL...');
            const result = await clientForFullUrl.api('https://graph.microsoft.com/beta/deviceManagement/importedDeviceIdentities')
                .top(1)
                .get();
            
            console.log('✅ API call with full URL successful!');
            console.log(`Retrieved ${result.value.length} device(s)`);
        } catch (error) {
            console.error('❌ API call with full URL failed:', error.message);
            if (error.statusCode) {
                console.error('Status code:', error.statusCode);
            }
            if (error.body) {
                console.error('Error response:', error.body);
            }
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testGraphClient().catch(error => {
    console.error('Unhandled error:', error);
}); 