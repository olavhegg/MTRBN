// A simple test script that doesn't require TypeScript compilation
// Run with: node src/test-connection.js

require('dotenv').config();
const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');

async function testGraphConnection() {
    console.log('=============================================');
    console.log('GRAPH API CONNECTION TEST (No compilation required)');
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
        return;
    }
    
    try {
        // Step 1: Create token credential
        console.log('\nCreating token credential...');
        const credential = new ClientSecretCredential(
            tenantId,
            clientId,
            clientSecret
        );
        
        // Step 2: Try to get a token directly
        console.log('Attempting to acquire token...');
        try {
            const tokenResponse = await credential.getToken(['https://graph.microsoft.com/.default']);
            console.log('✅ Token acquired successfully!');
        } catch (tokenError) {
            console.error('❌ Failed to acquire token:', tokenError.message);
            return;
        }
        
        // Step 3: Try with the specific Microsoft Graph Client approach
        console.log('\nTrying direct client approach with fetch...');
        
        // Get a token to use with fetch
        const token = await credential.getToken(['https://graph.microsoft.com/.default']);
        
        // Make a direct fetch call to the Microsoft Graph API
        try {
            const response = await fetch('https://graph.microsoft.com/v1.0/organization', {
                headers: {
                    'Authorization': `Bearer ${token.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Direct fetch API request successful!');
                console.log(`Retrieved ${data.value.length} organization(s)`);
            } else {
                console.error('❌ Direct fetch API request failed:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Error response:', errorText);
            }
        } catch (fetchError) {
            console.error('❌ Fetch request failed:', fetchError);
        }
        
        // Step 4: Try direct fetch to Intune endpoint
        console.log('\nTrying direct fetch to Intune endpoint...');
        try {
            const response = await fetch('https://graph.microsoft.com/beta/deviceManagement/importedDeviceIdentities?$top=1', {
                headers: {
                    'Authorization': `Bearer ${token.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Intune API request successful!');
                console.log(`Retrieved ${data.value.length} device(s)`);
            } else {
                console.error('❌ Intune API request failed:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Error response:', errorText);
            }
        } catch (fetchError) {
            console.error('❌ Fetch request failed:', fetchError);
        }
        
    } catch (error) {
        console.error('\n❌ Unexpected error:', error);
    }
}

// Run the test
testGraphConnection().catch(error => {
    console.error('Unhandled error:', error);
}); 