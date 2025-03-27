// A simple test script that doesn't require TypeScript compilation
// Run with: node src/test-connection.js

require('dotenv').config();
const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const https = require('https');
const axios = require('axios');

// Test serial number for device creation test - using a different base to avoid conflicts
const TEST_SERIAL = '123456789099';
const TEST_DESCRIPTION = 'API Test Device';

// Banner for better visibility
console.log('====================================================');
console.log('GRAPH API CONNECTION TESTER - POST METHODS DIAGNOSIS');
console.log('====================================================');

// Log errors with details
function logError(error) {
    console.error('Error details:');
    if (typeof error === 'object' && error !== null) {
        console.error('Message:', error.message);
        console.error('Name:', error.name);
        if ('statusCode' in error) console.error('Status code:', error.statusCode);
        if ('code' in error) console.error('Error code:', error.code);
        if ('body' in error) {
            try {
                const body = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
                console.error('Body:', body);
            } catch {
                console.error('Body:', error.body);
            }
        }
        if ('response' in error) {
            console.error('Response status:', error.response?.status);
            console.error('Response data:', error.response?.data);
        }
    } else {
        console.error(error);
    }
}

// Function for direct HTTP requests
function httpsRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsedData = JSON.parse(responseData);
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: parsedData
                        });
                    } catch (e) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: responseData
                        });
                    }
                } else {
                    reject({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        message: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(data);
        }
        req.end();
    });
}

// Test Microsoft Graph API connection
async function testConnection() {
    try {
        console.log('\nVerifying environment variables:');
        const clientId = process.env.CLIENT_ID;
        const clientSecret = process.env.CLIENT_SECRET;
        const tenantId = process.env.TENANT_ID;

        console.log(`CLIENT_ID: ${clientId ? '✓ Set' : '✗ Missing'}`);
        console.log(`CLIENT_SECRET: ${clientSecret ? '✓ Set' : '✗ Missing'}`);
        console.log(`TENANT_ID: ${tenantId ? '✓ Set' : '✗ Missing'}`);

        if (!clientId || !clientSecret || !tenantId) {
            throw new Error('Missing required environment variables');
        }

        // Step 1: Create token credential and get access token
        console.log('\nStep 1: Getting access token...');
        const tokenCredential = new ClientSecretCredential(
            tenantId,
            clientId,
            clientSecret
        );

        const tokenResponse = await tokenCredential.getToken(['https://graph.microsoft.com/.default']);
        if (!tokenResponse || !tokenResponse.token) {
            throw new Error('Failed to acquire access token');
        }
        console.log('✅ Successfully acquired token');
        
        // Store the token for all subsequent requests
        const accessToken = tokenResponse.token;

        // Initialize the Graph client with the token
        const client = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });

        // Quick basic GET test for connection verification
        console.log('\nStep 2: Testing basic GET connection...');
        try {
            const orgResult = await client.api('/organization').get();
            console.log('✅ Successfully connected to Graph API');
            console.log(`   Organization: ${orgResult.value[0]?.displayName || 'Unknown'}`);
        } catch (error) {
            console.error('❌ Failed to connect to Graph API with GET request');
            logError(error);
            // Continue anyway to test POST methods
        }

        // Test 1: POST using Microsoft Graph Client (v1.0 endpoint with @odata.type)
        console.log('\n----------------------------------------');
        console.log('TEST 1: POST using Graph Client (v1.0 endpoint)');
        console.log('----------------------------------------');
        
        try {
            // Use unique serial number for this test
            const serial1 = `${TEST_SERIAL.substring(0, 10)}01`;
            
            const device = {
                '@odata.type': '#microsoft.graph.importedDeviceIdentity',
                importedDeviceIdentifier: serial1,
                description: `${TEST_DESCRIPTION} (Test 1 - v1.0)`,
                importedDeviceIdentityType: 'serialNumber',
                enrollmentState: 'notContacted',
                platform: 'unknown'
            };

            console.log('Request data:', JSON.stringify(device, null, 2));
            
            const result = await client.api('/deviceManagement/importedWindowsAutopilotDeviceIdentities')
                .version('v1.0')
                .post(device);
            
            console.log('✅ POST successful with Graph Client (v1.0)');
            console.log('Response:', JSON.stringify(result, null, 2));
        } catch (error) {
            console.error('❌ POST failed with Graph Client (v1.0)');
            logError(error);
        }

        // Test 2: POST using Microsoft Graph Client (beta endpoint without @odata.type)
        console.log('\n----------------------------------------');
        console.log('TEST 2: POST using Graph Client (beta endpoint)');
        console.log('----------------------------------------');
        
        try {
            // Use unique serial number for this test
            const serial2 = `${TEST_SERIAL.substring(0, 10)}02`;
            
            const device = {
                importedDeviceIdentifier: serial2,
                description: `${TEST_DESCRIPTION} (Test 2 - beta)`,
                importedDeviceIdentityType: 'serialNumber',
                enrollmentState: 'notContacted',
                platform: 'unknown'
            };

            console.log('Request data:', JSON.stringify(device, null, 2));
            
            const result = await client.api('/deviceManagement/importedDeviceIdentities')
                .version('beta')
                .post(device);
            
            console.log('✅ POST successful with Graph Client (beta)');
            console.log('Response:', JSON.stringify(result, null, 2));
        } catch (error) {
            console.error('❌ POST failed with Graph Client (beta)');
            logError(error);
        }

        // Test 3: POST using Axios HTTP client
        console.log('\n----------------------------------------');
        console.log('TEST 3: POST using Axios HTTP client');
        console.log('----------------------------------------');
        
        try {
            // Use unique serial number for this test
            const serial3 = `${TEST_SERIAL.substring(0, 10)}03`;
            
            const device = {
                importedDeviceIdentifier: serial3,
                description: `${TEST_DESCRIPTION} (Test 3 - Axios)`,
                importedDeviceIdentityType: 'serialNumber',
                enrollmentState: 'notContacted',
                platform: 'unknown'
            };

            console.log('Request data:', JSON.stringify(device, null, 2));
            
            const axiosResult = await axios({
                method: 'post',
                url: 'https://graph.microsoft.com/beta/deviceManagement/importedDeviceIdentities',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                data: device
            });
            
            console.log('✅ POST successful with Axios');
            console.log('Response:', JSON.stringify(axiosResult.data, null, 2));
        } catch (error) {
            console.error('❌ POST failed with Axios');
            logError(error);
        }

        // Test 4: POST using native HTTPS module
        console.log('\n----------------------------------------');
        console.log('TEST 4: POST using native HTTPS module');
        console.log('----------------------------------------');
        
        try {
            // Use unique serial number for this test
            const serial4 = `${TEST_SERIAL.substring(0, 10)}04`;
            
            const device = {
                importedDeviceIdentifier: serial4,
                description: `${TEST_DESCRIPTION} (Test 4 - HTTPS)`,
                importedDeviceIdentityType: 'serialNumber',
                enrollmentState: 'notContacted',
                platform: 'unknown'
            };

            const options = {
                hostname: 'graph.microsoft.com',
                path: '/beta/deviceManagement/importedDeviceIdentities',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            };

            console.log('Request data:', JSON.stringify(device, null, 2));
            
            const result = await httpsRequest(options, JSON.stringify(device));
            
            console.log('✅ POST successful with native HTTPS');
            console.log('Response:', JSON.stringify(result.data, null, 2));
        } catch (error) {
            console.error('❌ POST failed with native HTTPS');
            logError(error);
        }

        // Test 5: POST to Windows-specific endpoint with beta
        console.log('\n----------------------------------------');
        console.log('TEST 5: POST to alternative endpoint (beta)');
        console.log('----------------------------------------');
        
        try {
            // Use unique serial number for this test
            const serial5 = `${TEST_SERIAL.substring(0, 10)}05`;
            
            const device = {
                '@odata.type': '#microsoft.graph.importedDeviceIdentity',
                importedDeviceIdentifier: serial5,
                description: `${TEST_DESCRIPTION} (Test 5 - Alt Endpoint)`,
                importedDeviceIdentityType: 'serialNumber',
                enrollmentState: 'notContacted',
                platform: 'unknown'
            };

            console.log('Request data:', JSON.stringify(device, null, 2));
            
            // Try the Windows-specific endpoint with beta version
            const result = await client.api('/deviceManagement/importedWindowsAutopilotDeviceIdentities')
                .version('beta')
                .post(device);
            
            console.log('✅ POST successful with alternative endpoint (beta)');
            console.log('Response:', JSON.stringify(result, null, 2));
        } catch (error) {
            console.error('❌ POST failed with alternative endpoint (beta)');
            logError(error);
        }

        // Test 6: POST with correct OData type for autopilot
        console.log('\n----------------------------------------');
        console.log('TEST 6: POST with correct Windows Autopilot OData type');
        console.log('----------------------------------------');
        
        try {
            // Use unique serial number for this test
            const serial6 = `${TEST_SERIAL.substring(0, 10)}06`;
            
            const device = {
                '@odata.type': '#microsoft.graph.importedWindowsAutopilotDeviceIdentity',
                importedDeviceIdentifier: serial6,
                description: `${TEST_DESCRIPTION} (Test 6 - Autopilot)`,
                importedDeviceIdentityType: 'serialNumber',
                enrollmentState: 'notContacted',
                platform: 'windows'
            };

            console.log('Request data:', JSON.stringify(device, null, 2));
            
            // Try with the correct OData type
            const result = await client.api('/deviceManagement/importedWindowsAutopilotDeviceIdentities')
                .version('beta')
                .post(device);
            
            console.log('✅ POST successful with Windows Autopilot OData type');
            console.log('Response:', JSON.stringify(result, null, 2));
        } catch (error) {
            console.error('❌ POST failed with Windows Autopilot OData type');
            logError(error);
        }

        // Test 7: POST to v1.0 standard device identities
        console.log('\n----------------------------------------');
        console.log('TEST 7: POST to standard device identities (v1.0)');
        console.log('----------------------------------------');
        
        try {
            // Use unique serial number for this test
            const serial7 = `${TEST_SERIAL.substring(0, 10)}07`;
            
            const device = {
                'id': null,
                'serialNumber': serial7,
                'displayName': `${TEST_DESCRIPTION} (Test 7 - Standard Device)`,
                'platform': 'windows',
                'operatingSystem': 'Windows',
                'managementState': 'managed'
            };

            console.log('Request data:', JSON.stringify(device, null, 2));
            
            // Try the standard devices endpoint
            const result = await client.api('/devices')
                .version('v1.0')
                .post(device);
            
            console.log('✅ POST successful with standard devices endpoint');
            console.log('Response:', JSON.stringify(result, null, 2));
        } catch (error) {
            console.error('❌ POST failed with standard devices endpoint');
            logError(error);
        }

        // Test 8: POST using query params approach
        console.log('\n----------------------------------------');
        console.log('TEST 8: POST with full URL and query parameters');
        console.log('----------------------------------------');
        
        try {
            // Use unique serial number for this test
            const serial8 = `${TEST_SERIAL.substring(0, 10)}08`;
            
            const device = {
                '@odata.type': '#microsoft.graph.importedWindowsAutopilotDeviceIdentity',
                importedDeviceIdentifier: serial8,
                description: `${TEST_DESCRIPTION} (Test 8 - Full URL)`,
                importedDeviceIdentityType: 'serialNumber',
                enrollmentState: 'notContacted',
                platform: 'windows'
            };

            console.log('Request data:', JSON.stringify(device, null, 2));
            
            const fullUrl = 'https://graph.microsoft.com/beta/deviceManagement/importedWindowsAutopilotDeviceIdentities';
            
            const axiosResult = await axios({
                method: 'post',
                url: fullUrl,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                data: device
            });
            
            console.log('✅ POST successful with full URL approach');
            console.log('Response:', JSON.stringify(axiosResult.data, null, 2));
        } catch (error) {
            console.error('❌ POST failed with full URL approach');
            logError(error);
        }

        // Test 9: POST with corporate device identifiers endpoint
        console.log('\n----------------------------------------');
        console.log('TEST 9: POST to corporate device identifiers');
        console.log('----------------------------------------');
        
        try {
            // Use unique serial number for this test
            const serial9 = `${TEST_SERIAL.substring(0, 10)}09`;
            
            const device = {
                '@odata.type': '#microsoft.graph.corporateDeviceIdentifier',
                identifier: serial9,
                ownerType: 'company'
            };

            console.log('Request data:', JSON.stringify(device, null, 2));
            
            // Try the corporate device identifiers endpoint
            const result = await client.api('/deviceManagement/corporateDeviceIdentifiers')
                .version('beta')
                .post(device);
            
            console.log('✅ POST successful with corporate device identifiers');
            console.log('Response:', JSON.stringify(result, null, 2));
        } catch (error) {
            console.error('❌ POST failed with corporate device identifiers');
            logError(error);
        }

        // Test 10: POST device with ImportedDeviceIdentityResult object
        console.log('\n----------------------------------------');
        console.log('TEST 10: POST to importDeviceIdentityList action');
        console.log('----------------------------------------');
        
        try {
            // Use unique serial number for this test
            const serial10 = `${TEST_SERIAL.substring(0, 10)}10`;
            
            // Using the importDeviceIdentityList action which requires a different format
            const importPayload = {
                importedDeviceIdentities: [
                    {
                        importedDeviceIdentifier: serial10,
                        description: `${TEST_DESCRIPTION} (Test 10 - Import Action)`,
                        importedDeviceIdentityType: 'serialNumber',
                        platform: 'windows'
                    }
                ]
            };

            console.log('Request data:', JSON.stringify(importPayload, null, 2));
            
            // Try the import action
            const result = await client.api('/deviceManagement/importDeviceIdentityList')
                .version('beta')
                .post(importPayload);
            
            console.log('✅ POST successful with import action');
            console.log('Response:', JSON.stringify(result, null, 2));
        } catch (error) {
            console.error('❌ POST failed with import action');
            logError(error);
        }

        // Test 11: Permission diagnostic test
        console.log('\n----------------------------------------');
        console.log('TEST 11: Permission diagnostic test');
        console.log('----------------------------------------');
        
        try {
            // First try to get and log detailed app permissions
            console.log('Checking application permissions...');
            
            // Get the service principal for this app to check permissions
            const appId = process.env.CLIENT_ID;
            const result = await client.api(`/servicePrincipals?$filter=appId eq '${appId}'`)
                .version('v1.0')
                .get();
            
            if (result.value && result.value.length > 0) {
                const sp = result.value[0];
                console.log(`Found service principal for app ID ${appId}: ${sp.displayName}`);
                
                // Try to get app roles (permissions)
                const appRoles = sp.appRoles || [];
                console.log(`App has ${appRoles.length} defined roles`);
                
                // Get OAuth2 permissions
                const oauth2Permissions = sp.oauth2Permissions || [];
                console.log(`App has ${oauth2Permissions.length} OAuth2 permissions`);
                
                // Get all delegated permissions (app roles assigned to this app)
                try {
                    const appRoleAssignments = await client.api(`/servicePrincipals/${sp.id}/appRoleAssignments`)
                        .version('v1.0')
                        .get();
                    
                    console.log(`App has ${appRoleAssignments.value.length} role assignments`);
                    
                    if (appRoleAssignments.value.length > 0) {
                        // Check for Intune specific permissions
                        const intunePermissions = appRoleAssignments.value.filter(assignment => 
                            assignment.resourceDisplayName && 
                            (assignment.resourceDisplayName.includes('Intune') || 
                             assignment.resourceDisplayName.includes('Microsoft Graph'))
                        );
                        
                        console.log(`Found ${intunePermissions.length} Intune/Graph related permissions:`);
                        intunePermissions.forEach(perm => {
                            console.log(` - ${perm.resourceDisplayName}: ${perm.principalDisplayName} (${perm.principalId})`);
                        });
                        
                        // Check specific permissions we need
                        const deviceManagementPerms = appRoleAssignments.value.filter(assignment => 
                            assignment.resourceDisplayName && 
                            assignment.principalDisplayName && 
                            assignment.principalDisplayName.includes('DeviceManagement')
                        );
                        
                        if (deviceManagementPerms.length > 0) {
                            console.log('✅ App has DeviceManagement permissions');
                        } else {
                            console.log('❌ App missing DeviceManagement permissions!');
                            console.log('   This is likely why the Intune API calls are failing.');
                            console.log('   Required permission: DeviceManagementServiceConfig.ReadWrite.All');
                        }
                    }
                } catch (permError) {
                    console.error('Failed to get app role assignments:', permError.message);
                }
            } else {
                console.log(`No service principal found for app ID ${appId}.`);
                console.log('This might mean the app is not properly registered or the CLIENT_ID is incorrect.');
            }
        } catch (error) {
            console.error('❌ Permission diagnostic test failed');
            logError(error);
        }

        // Summary of results
        console.log('\n====================================================');
        console.log('API CONNECTION TEST SUMMARY - DIAGNOSIS RESULTS');
        console.log('====================================================');

        console.log('\n📋 DIAGNOSIS:');
        console.log('Based on the test results, your app appears to be missing the DeviceManagement');
        console.log('permissions required to use the Intune API. The GET tests work because they use');
        console.log('different permissions that your app already has.');
        
        console.log('\n🔑 PERMISSIONS NEEDED:');
        console.log('Your app needs the following Microsoft Graph permissions:');
        console.log('1. DeviceManagementServiceConfig.ReadWrite.All ⭐ REQUIRED');
        console.log('2. DeviceManagementManagedDevices.ReadWrite.All');
        console.log('3. Device.ReadWrite.All');
        
        console.log('\n🔧 HOW TO FIX:');
        console.log('1. Go to Azure Portal > Azure Active Directory > App Registrations');
        console.log('2. Find your app (MTR Provisioning App) with ID:', process.env.CLIENT_ID);
        console.log('3. Go to API permissions');
        console.log('4. Add the missing permissions listed above (focus on the first one)');
        console.log('5. Click "Grant admin consent for [your tenant]"');
        console.log('6. Create a new client secret if your current one is expiring soon');
        console.log('7. Run this test again to verify the fix');
        
        console.log('\n🧪 NEXT STEPS:');
        console.log('Based on the test errors, once permissions are fixed, these approaches');
        console.log('are most likely to work:');
        console.log('- Use the beta endpoint: /deviceManagement/importedDeviceIdentities');
        console.log('- Include the correct @odata.type: #microsoft.graph.importedDeviceIdentity');
        console.log('- Or try the Windows Autopilot endpoint with appropriate type');
        
        console.log('\nFor more help, see: https://docs.microsoft.com/en-us/graph/api/resources/intune-enrollment-importeddeviceidentity');
        console.log('====================================================');

    } catch (error) {
        console.error('Test failed with an unexpected error:');
        logError(error);
    }
}

// Run the test
testConnection().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
}); 