require('dotenv').config();
const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const https = require('https');

// Log errors with more details
function logError(error) {
    console.error('Error details:');
    if (typeof error === 'object' && error !== null) {
        console.error('Message:', error.message);
        console.error('Name:', error.name);
        if ('statusCode' in error) console.error('Status code:', error.statusCode);
        if ('code' in error) console.error('Error code:', error.code);
        if ('body' in error) console.error('Body:', error.body);
    } else {
        console.error(error);
    }
}

// HTTP request using native Node.js https
function httpsRequest(url, options) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsedData = JSON.parse(data);
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: parsedData
                        });
                    } catch (e) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: data
                        });
                    }
                } else {
                    reject({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        message: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function runTest() {
    try {
        console.log('Starting Graph API test for device management');
        console.log('Environment check:');
        console.log(`CLIENT_ID: ${process.env.CLIENT_ID ? '✓ Set' : '✗ Missing'}`);
        console.log(`CLIENT_SECRET: ${process.env.CLIENT_SECRET ? '✓ Set' : '✗ Missing'}`);
        console.log(`TENANT_ID: ${process.env.TENANT_ID ? '✓ Set' : '✗ Missing'}`);

        if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.TENANT_ID) {
            throw new Error('Missing required environment variables');
        }

        // Create token credential for auth
        const tokenCredential = new ClientSecretCredential(
            process.env.TENANT_ID,
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET
        );

        console.log('Token credential created, getting auth token...');
        const token = await tokenCredential.getToken(['https://graph.microsoft.com/.default']);
        console.log('Token acquired successfully');

        // TEST 1: List all imported device identities without filter
        console.log('\n=== TEST 1: Graph client - List all devices ===');
        try {
            const graphClient = Client.init({
                authProvider: async (done) => {
                    try {
                        done(null, token.token);
                    } catch (error) {
                        done(error, null);
                    }
                }
            });

            console.log('Graph client initialized');
            
            const endpoint = 'https://graph.microsoft.com/beta/deviceManagement/importedDeviceIdentities';
            console.log(`Calling API with endpoint: ${endpoint}`);

            const result = await graphClient.api(endpoint).get();
            
            console.log('TEST 1 SUCCESS! Result:', result);
            if (result.value && result.value.length > 0) {
                console.log(`Found ${result.value.length} devices. First device:`, result.value[0]);
            } else {
                console.log('No devices found.');
            }
        } catch (error) {
            console.error('TEST 1 FAILED!');
            logError(error);
        }

        // TEST 2: Native HTTPS request
        console.log('\n=== TEST 2: Native HTTPS - List all devices ===');
        try {
            const url = new URL('https://graph.microsoft.com/beta/deviceManagement/importedDeviceIdentities');
            console.log(`Calling API with HTTPS: ${url.toString()}`);
            
            const response = await httpsRequest(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('TEST 2 SUCCESS! Response:', response.data);
            if (response.data.value && response.data.value.length > 0) {
                console.log(`Found ${response.data.value.length} devices. First device:`, response.data.value[0]);
            } else {
                console.log('No devices found.');
            }
        } catch (error) {
            console.error('TEST 2 FAILED!');
            logError(error);
        }

        // TEST 3: Try to list other device endpoints
        console.log('\n=== TEST 3: Graph client - List device management endpoints ===');
        try {
            const graphClient = Client.init({
                authProvider: async (done) => {
                    try {
                        done(null, token.token);
                    } catch (error) {
                        done(error, null);
                    }
                }
            });

            console.log('Graph client initialized');
            
            // Try deviceManagement endpoint to see what's available
            const endpoint = 'https://graph.microsoft.com/beta/deviceManagement';
            console.log(`Calling API with endpoint: ${endpoint}`);

            const result = await graphClient.api(endpoint).get();
            
            console.log('TEST 3 SUCCESS! Result:', result);
        } catch (error) {
            console.error('TEST 3 FAILED!');
            logError(error);
        }

    } catch (error) {
        console.error('Test failed with error:');
        logError(error);
    }
}

runTest(); 