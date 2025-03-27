// Test Android Device Upload 
// This file tests alternative approaches for importing Android device identities
// Run with: node src/test-android-upload.js <serialNumber> <description>

require('dotenv').config();
const { ClientSecretCredential } = require('@azure/identity');
const axios = require('axios');
const { Client } = require('@microsoft/microsoft-graph-client');

// Check arguments
const serialNumber = process.argv[2] || 'LogitechMTR999';
const description = process.argv[3] || 'Logitech MTR Android Test Device';

// Get access token
async function getAccessToken() {
    const tokenCredential = new ClientSecretCredential(
        process.env.TENANT_ID,
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET
    );
    
    const token = await tokenCredential.getToken(['https://graph.microsoft.com/.default']);
    return token.token;
}

// Get Graph client
async function getGraphClient() {
    const token = await getAccessToken();
    
    return Client.init({
        authProvider: (done) => {
            done(null, token);
        }
    });
}

// APPROACH 1: Using Graph Client
async function uploadViaGraphClient(serial, description) {
    console.log('\n--- APPROACH 1: Using Graph Client ---');
    try {
        const client = await getGraphClient();
        
        // Android device payload
        const payload = {
            '@odata.type': '#microsoft.graph.importedDeviceIdentity',
            importedDeviceIdentifier: serial,
            importedDeviceIdentityType: 'serialNumber',
            description: description,
            enrollmentState: 'unknown',
            platform: 'android'
        };
        
        console.log('Payload:', JSON.stringify(payload, null, 2));
        
        // Using the beta endpoint with Graph client
        const result = await client
            .api('/deviceManagement/importedDeviceIdentities')
            .version('beta')
            .post(payload);
        
        console.log('✅ Success via Graph Client:', result);
        return result;
    } catch (error) {
        console.error('❌ Failed with Graph Client:', error.message);
        if (error.statusCode) console.error('Status code:', error.statusCode);
        if (error.body) console.error('Error body:', typeof error.body === 'string' ? JSON.parse(error.body) : error.body);
        
        // Don't throw, let's try other approaches
        return null;
    }
}

// APPROACH 2: Using direct axios call
async function uploadViaAxios(serial, description) {
    console.log('\n--- APPROACH 2: Using Direct Axios Call ---');
    try {
        const token = await getAccessToken();
        
        // Android device payload
        const payload = {
            '@odata.type': '#microsoft.graph.importedDeviceIdentity',
            importedDeviceIdentifier: serial,
            importedDeviceIdentityType: 'serialNumber',
            description: description,
            enrollmentState: 'notContacted',
            platform: 'android'
        };
        
        console.log('Payload:', JSON.stringify(payload, null, 2));
        
        // Direct axios call
        const response = await axios({
            method: 'post',
            url: 'https://graph.microsoft.com/beta/deviceManagement/importedDeviceIdentities',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: payload
        });
        
        console.log('✅ Success via Axios:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Failed with Axios:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error data:', error.response.data);
        }
        
        // Don't throw, let's try other approaches
        return null;
    }
}

// APPROACH 3: Using Microsoft Intune's bulk import API
async function uploadViaBulkImport(serial, description) {
    console.log('\n--- APPROACH 3: Using Intune Bulk Import API ---');
    try {
        const token = await getAccessToken();
        
        // Create bulk import payload with just a single device
        const payload = {
            '@odata.type': '#microsoft.graph.importedDeviceIdentityList',
            deviceIdentities: [
                {
                    '@odata.type': '#microsoft.graph.importedDeviceIdentity',
                    importedDeviceIdentifier: serial,
                    importedDeviceIdentityType: 'serialNumber',
                    description: description,
                    platform: 'android'
                }
            ]
        };
        
        console.log('Bulk import payload:', JSON.stringify(payload, null, 2));
        
        // Try the special bulkCreateImportedDeviceIdentity action endpoint
        const response = await axios({
            method: 'post',
            url: 'https://graph.microsoft.com/beta/deviceManagement/importedDeviceIdentities/importDeviceIdentityList',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: payload
        });
        
        console.log('✅ Success via Bulk Import:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Failed with Bulk Import:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error data:', error.response.data);
        }
        
        // Don't throw, let's try other approaches
        return null;
    }
}

// APPROACH 4: Using Corporate Device Identifiers
async function uploadViaCorporateIdentifiers(serial, description) {
    console.log('\n--- APPROACH 4: Using Corporate Device Identifiers ---');
    try {
        const token = await getAccessToken();
        
        // Corporate device identifier payload
        const payload = {
            identifier: serial,
            ownerType: 'company',
            description: description
        };
        
        console.log('Payload:', JSON.stringify(payload, null, 2));
        
        // Try the corporate device identifiers endpoint
        const response = await axios({
            method: 'post',
            url: 'https://graph.microsoft.com/beta/deviceManagement/corporateDeviceIdentifiers',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: payload
        });
        
        console.log('✅ Success via Corporate Identifiers:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Failed with Corporate Identifiers:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error data:', error.response.data);
        }
        
        // Don't throw, let's try other approaches
        return null;
    }
}

// Check if a device exists
async function checkDeviceExists(serial) {
    console.log(`\nChecking for device: ${serial}`);
    try {
        const client = await getGraphClient();
        
        // Try to find device in importedDeviceIdentities
        try {
            const result = await client
                .api('/deviceManagement/importedDeviceIdentities')
                .version('beta')
                .get();
            
            console.log(`Found ${result.value?.length || 0} imported device identities`);
            
            const device = result.value?.find(d => d.importedDeviceIdentifier === serial);
            if (device) {
                console.log('✅ Device found in importedDeviceIdentities:', device);
                return device;
            }
        } catch (err) {
            console.error('Failed to check importedDeviceIdentities:', err.message);
        }
        
        // Try to find device in corporateDeviceIdentifiers
        try {
            const result = await client
                .api('/deviceManagement/corporateDeviceIdentifiers')
                .version('beta')
                .get();
            
            console.log(`Found ${result.value?.length || 0} corporate device identifiers`);
            
            const device = result.value?.find(d => d.identifier === serial);
            if (device) {
                console.log('✅ Device found in corporateDeviceIdentifiers:', device);
                return device;
            }
        } catch (err) {
            console.error('Failed to check corporateDeviceIdentifiers:', err.message);
        }
        
        console.log('❌ Device not found in any collections');
        return null;
    } catch (error) {
        console.error('❌ Error checking device existence:', error.message);
        return null;
    }
}

// Main test function
async function runTest() {
    console.log('======================================');
    console.log('ANDROID DEVICE UPLOAD TEST - MULTIPLE APPROACHES');
    console.log('======================================');
    console.log(`Serial: ${serialNumber}`);
    console.log(`Description: ${description}`);
    
    try {
        // Check if device already exists
        const existingDevice = await checkDeviceExists(serialNumber);
        if (existingDevice) {
            console.log('\nDevice already exists, skipping upload attempts');
            return;
        }
        
        // Try all approaches one by one
        let result = await uploadViaGraphClient(serialNumber, description);
        if (result) return;
        
        result = await uploadViaAxios(serialNumber, description);
        if (result) return;
        
        result = await uploadViaBulkImport(serialNumber, description);
        if (result) return;
        
        result = await uploadViaCorporateIdentifiers(serialNumber, description);
        if (result) return;
        
        // Verify if any approach worked by checking again
        console.log('\nVerifying if any approach worked...');
        const createdDevice = await checkDeviceExists(serialNumber);
        
        if (createdDevice) {
            console.log('✅ Device was successfully created.');
        } else {
            console.log('❌ All approaches failed. The device could not be created.');
        }
    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
    }
}

// Run the test
runTest()
    .then(() => console.log('\nTest completed'))
    .catch(err => console.error('Fatal error:', err)); 