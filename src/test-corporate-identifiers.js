// Reference Implementation for Intune Device Import - Android Devices
// This file demonstrates the way to import Android device serial numbers to Intune
// Run with: node src/test-corporate-identifiers.js <serialNumber> <description>

require('dotenv').config();
const { ClientSecretCredential } = require('@azure/identity');
const axios = require('axios');
const { Client } = require('@microsoft/microsoft-graph-client');

// Check arguments
const serialNumber = process.argv[2] || '123456789002';
const description = process.argv[3] || 'Logitech MTR Android Device';

// Centralized function to get access token
async function getAccessToken() {
    const tokenCredential = new ClientSecretCredential(
        process.env.TENANT_ID,
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET
    );
    
    const token = await tokenCredential.getToken(['https://graph.microsoft.com/.default']);
    return token.token;
}

// Get a Graph Client instance
async function getGraphClient() {
    const token = await getAccessToken();
    
    return Client.init({
        authProvider: (done) => {
            done(null, token);
        }
    });
}

// Function to upload an Android device identity
async function uploadDeviceIdentity(serial, description) {
    try {
        const client = await getGraphClient();
        
        const body = {
            "@odata.type": "#microsoft.graph.importedDeviceIdentity",
            importedDeviceIdentifier: serial,
            importedDeviceIdentityType: "serialNumber",
            description: description,
            enrollmentState: "unknown",
            platform: "android"
        };

        console.log('Posting device payload:', body);

        // Use Graph Client instead of direct axios
        const result = await client
            .api('deviceManagement/importedDeviceIdentities')
            .version('beta')
            .post(body);
            
        console.log('✅ Successfully added Android device');
        console.log('Device data:', result);
        return result;
    } catch (error) {
        console.error('❌ Failed to add Android device');
        
        if (error.statusCode) {
            console.error('Status code:', error.statusCode);
        }
        
        if (error.message) {
            console.error('Error message:', error.message);
        }
        
        if (error.body) {
            try {
                const errorBody = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
                console.error('Error details:', errorBody);
            } catch (e) {
                console.error('Error body:', error.body);
            }
        }
        
        throw error;
    }
}

// Function to check if a device exists
async function checkDeviceExists(serial) {
    try {
        const client = await getGraphClient();
        
        // Get all devices and filter in JavaScript
        const result = await client
            .api('deviceManagement/importedDeviceIdentities')
            .version('beta')
            .get();
        
        if (result.value) {
            console.log(`Found ${result.value.length} existing devices`);
            
            // Find device with matching serial
            const existingDevice = result.value.find(d => 
                d.importedDeviceIdentifier === serial
            );
            
            if (existingDevice) {
                console.log('⚠️ Device already exists with this serial number');
                console.log('Existing device details:');
                console.log('- ID:', existingDevice.id);
                console.log('- Identifier:', existingDevice.importedDeviceIdentifier);
                console.log('- Description:', existingDevice.description);
                console.log('- Platform:', existingDevice.platform);
                console.log('- Enrollment State:', existingDevice.enrollmentState);
                return existingDevice;
            }
        }
        
        return null;
    } catch (error) {
        console.error('❌ Failed to check if device exists');
        
        if (error.statusCode) {
            console.error('Status code:', error.statusCode);
        }
        
        if (error.message) {
            console.error('Error message:', error.message);
        }
        
        throw error;
    }
}

// Main test function
async function testDeviceImport() {
    console.log('===================================================');
    console.log('ANDROID DEVICE IMPORT FOR LOGITECH MTR');
    console.log('===================================================\n');

    console.log(`Testing with Serial Number: ${serialNumber}`);
    console.log(`Description: ${description}\n`);

    try {
        // Get the token first to validate credentials
        console.log('Getting access token...');
        await getAccessToken();
        console.log('✅ Successfully acquired token\n');

        // Check if the device already exists
        console.log('\n----- Checking if device already exists -----');
        const existingDevice = await checkDeviceExists(serialNumber);
        
        if (existingDevice) {
            console.log('\nSkipping import. Device already exists.');
            return;
        }
        
        console.log(`✅ Device with serial ${serialNumber} does not exist yet, will create`);

        // Create device using importedDeviceIdentities endpoint as Android device
        console.log('\n----- Creating Android MTR device -----');
        await uploadDeviceIdentity(serialNumber, description);
        
        // Verify device was created
        console.log('\n----- Verifying device creation -----');
        const createdDevice = await checkDeviceExists(serialNumber);
        
        if (createdDevice) {
            console.log('✅ Device successfully verified in Intune');
        } else {
            console.error('❌ Device could not be verified after creation. It may have been created but not yet available in the API.');
        }

    } catch (error) {
        console.error('❌ General error:', error.message);
    }
}

// Run the tests
testDeviceImport().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
}); 