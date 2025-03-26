require('dotenv').config();
const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const https = require('https');

// Use a serial number that we know exists from the previous test
const KNOWN_SERIAL = '2435FDR0HE92';

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
        console.log(`Starting Graph API test for specific device serial: ${KNOWN_SERIAL}`);
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

        // TEST 1: Graph client with filter query for known device
        console.log('\n=== TEST 1: Graph client with filter for known device ===');
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
            const filter = `importedDeviceIdentifier eq '${KNOWN_SERIAL}'`;
            console.log(`Calling API with endpoint: ${endpoint} and filter: ${filter}`);

            const result = await graphClient.api(endpoint)
                .filter(filter)
                .get();
            
            console.log('TEST 1 SUCCESS! Result:', result);
        } catch (error) {
            console.error('TEST 1 FAILED!');
            logError(error);
        }

        // TEST 2: Native HTTPS with filter in query string
        console.log('\n=== TEST 2: Native HTTPS with filter for known device ===');
        try {
            const url = new URL(`https://graph.microsoft.com/beta/deviceManagement/importedDeviceIdentities?$filter=importedDeviceIdentifier eq '${KNOWN_SERIAL}'`);
            console.log(`Calling API with HTTPS: ${url.toString()}`);
            
            const response = await httpsRequest(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('TEST 2 SUCCESS! Response:', response.data);
        } catch (error) {
            console.error('TEST 2 FAILED!');
            logError(error);
        }

        // TEST 3: Graph client - simply get all devices and filter in JavaScript
        console.log('\n=== TEST 3: Get all devices and filter in JavaScript ===');
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
            console.log(`Calling API with endpoint: ${endpoint} (no filter)`);

            const result = await graphClient.api(endpoint).get();
            
            console.log('API call successful, searching for device in result...');
            
            if (result.value && result.value.length > 0) {
                const device = result.value.find(d => d.importedDeviceIdentifier === KNOWN_SERIAL);
                if (device) {
                    console.log('TEST 3 SUCCESS! Found device:', device);
                } else {
                    console.log('TEST 3 FAILED! Device not found in results');
                }
            } else {
                console.log('TEST 3 FAILED! No devices found in results');
            }
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